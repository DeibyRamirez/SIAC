import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import JSZip from 'jszip';
import mammoth from 'mammoth';

import {
  ComentarioWordEntrada,
  HunkDiff,
  LineaDiff,
  MediaDiff,
  PROPIEDAD_FIRMA_SIAC,
  ResultadoDiffDocx,
  ResultadoInyeccionComentarios,
  ResultadoProcesamientoDocx,
  ZonaCorreccionEntrada,
} from './tipos-docx';

const PREFIJO_FIRMA_CORE = `${PROPIEDAD_FIRMA_SIAC}=`;

const RUTA_CORE = 'docProps/core.xml';
const NS_CORE_PROPERTIES =
  'http://schemas.openxmlformats.org/package/2006/metadata/core-properties';
const PREFIJO_CORE_POR_DEFECTO = 'cp';

const OPCIONES_GENERAR_ZIP: JSZip.JSZipGeneratorOptions<'nodebuffer'> = {
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 },
};

@Injectable()
export class ServicioManipulacionDocx {
  validarEsDocxZip(buffer: Buffer): void {
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new BadRequestException(
        'El archivo no es un documento Word (.docx) válido.',
      );
    }
  }

  /** @deprecated Usar lectura en core.xml; mantiene compatibilidad con archivos antiguos. */
  async leerFirmaCustom(buffer: Buffer): Promise<string | null> {
    return this.leerFirmaDocumento(buffer);
  }

  async leerFirmaDocumento(buffer: Buffer): Promise<string | null> {
    const zip = await JSZip.loadAsync(buffer);

    const firmaCore = await this.leerFirmaDesdeCore(zip);
    if (firmaCore) return firmaCore;

    return this.leerFirmaDesdeCustom(zip);
  }

  generarValorFirma(
    evidenciaId: string,
    numeroVersion: number,
  ): string {
    const uuid = randomUUID();
    const payload = `${evidenciaId}:${numeroVersion}:${uuid}`;
    const hash = createHash('sha256').update(payload).digest('hex');
    return `${payload}:${hash}`;
  }

  async escribirFirmaEnCore(
    buffer: Buffer,
    valorFirma: string,
  ): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buffer);
    const archivoCore = zip.file(RUTA_CORE);
    if (!archivoCore) {
      throw new BadRequestException(
        'El documento no contiene docProps/core.xml; no se puede aplicar la firma SIAC.',
      );
    }

    const xmlOriginal = await archivoCore.async('string');
    const xmlActualizado = this.inyectarFirmaEnCoreXml(xmlOriginal, valorFirma);

    zip.file(RUTA_CORE, xmlActualizado, { binary: false });
    await this.validarPartesContentTypes(zip);
    return Buffer.from(await zip.generateAsync(OPCIONES_GENERAR_ZIP));
  }

  /**
   * Firma una descarga con un token único por evidencia+versión. Crea
   * docProps/core.xml (con su relación y tipo de contenido) si el documento
   * no lo trae, para poder garantizar la firma anti-reuso.
   */
  async firmarDescarga(buffer: Buffer, valorFirma: string): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buffer);
    await this.asegurarCoreProperties(zip);

    const archivoCore = zip.file(RUTA_CORE);
    if (!archivoCore) {
      throw new BadRequestException(
        'No se pudo preparar docProps/core.xml para firmar la descarga.',
      );
    }
    const xml = await archivoCore.async('string');
    zip.file(RUTA_CORE, this.inyectarFirmaEnCoreXml(xml, valorFirma), {
      binary: false,
    });
    await this.validarPartesContentTypes(zip);
    return Buffer.from(await zip.generateAsync(OPCIONES_GENERAR_ZIP));
  }

  private async asegurarCoreProperties(zip: JSZip): Promise<void> {
    if (!zip.file(RUTA_CORE)) {
      zip.file(
        RUTA_CORE,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="${NS_CORE_PROPERTIES}" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"></cp:coreProperties>`,
      );
    }

    const contentTypes = zip.file('[Content_Types].xml');
    if (contentTypes) {
      let xmlCt = await contentTypes.async('string');
      if (!xmlCt.includes('/docProps/core.xml')) {
        xmlCt = xmlCt.replace(
          '</Types>',
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
        );
        zip.file('[Content_Types].xml', xmlCt);
      }
    }

    const rutaRels = '_rels/.rels';
    const archivoRels = zip.file(rutaRels);
    let rels = archivoRels
      ? await archivoRels.async('string')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
    const tipoCore =
      'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';
    if (!rels.includes(tipoCore)) {
      rels = rels.replace(
        '</Relationships>',
        `<Relationship Id="rIdCorePropsSiac" Type="${tipoCore}" Target="docProps/core.xml"/></Relationships>`,
      );
      zip.file(rutaRels, rels);
    }
  }

  /**
   * Inyecta la firma en un nodo ya presente de docProps/core.xml
   * (cp:keywords o dc:description). No crea parts nuevos ni toca el resto del ZIP.
   */
  private inyectarFirmaEnCoreXml(xml: string, valorFirma: string): string {
    const raiz = xml.match(/<([A-Za-z_][\w.-]*:)?coreProperties\b[^>]*>/i);
    if (!raiz || raiz.index === undefined) {
      throw new BadRequestException(
        'docProps/core.xml no contiene un nodo coreProperties válido.',
      );
    }

    let xmlTrabajo = xml;
    let prefijoCore = this.resolverPrefijo(raiz[0], NS_CORE_PROPERTIES);
    if (prefijoCore === null) {
      const nuevoRaiz = raiz[0].replace(
        /\/?>$/,
        ` xmlns:${PREFIJO_CORE_POR_DEFECTO}="${NS_CORE_PROPERTIES}">`,
      );
      xmlTrabajo =
        xmlTrabajo.slice(0, raiz.index) +
        nuevoRaiz +
        xmlTrabajo.slice(raiz.index + raiz[0].length);
      prefijoCore = `${PREFIJO_CORE_POR_DEFECTO}:`;
    }

    const conKeywords = this.escribirEnEtiqueta(
      xmlTrabajo,
      'keywords',
      valorFirma,
    );
    if (conKeywords) {
      return conKeywords;
    }

    const conDescripcion = this.escribirEnEtiqueta(
      xmlTrabajo,
      'description',
      valorFirma,
    );
    if (conDescripcion) {
      return conDescripcion;
    }

    return this.agregarEtiquetaEnRaiz(xmlTrabajo, prefijoCore, valorFirma);
  }

  /** Reemplaza el contenido de la etiqueta local indicada si existe. */
  private escribirEnEtiqueta(
    xml: string,
    nombreLocal: string,
    valorFirma: string,
  ): string | null {
    const par = new RegExp(
      `(<(?:[A-Za-z_][\\w.-]*:)?${nombreLocal}\\b[^>]*>)([\\s\\S]*?)(<\\/(?:[A-Za-z_][\\w.-]*:)?${nombreLocal}>)`,
      'i',
    ).exec(xml);
    if (par && par.index !== undefined) {
      const contenido = this.combinarConFirma(par[2], valorFirma);
      return (
        xml.slice(0, par.index) +
        par[1] +
        this.escapeXml(contenido) +
        par[3] +
        xml.slice(par.index + par[0].length)
      );
    }

    const autocerrado = new RegExp(
      `(<(?:[A-Za-z_][\\w.-]*:)?${nombreLocal}\\b(?:\\s[^>]*?)?)\\/>`,
      'i',
    ).exec(xml);
    if (autocerrado && autocerrado.index !== undefined) {
      const prefijo =
        autocerrado[1].match(/^<([A-Za-z_][\w.-]*:)?/)?.[1] ?? '';
      const contenido = this.combinarConFirma('', valorFirma);
      return (
        xml.slice(0, autocerrado.index) +
        `${autocerrado[1]}>${this.escapeXml(contenido)}</${prefijo}${nombreLocal}>` +
        xml.slice(autocerrado.index + autocerrado[0].length)
      );
    }

    return null;
  }

  /** Crea la etiqueta como hijo directo de coreProperties usando el prefijo declarado. */
  private agregarEtiquetaEnRaiz(
    xml: string,
    prefijoCore: string,
    valorFirma: string,
  ): string {
    const cierre = xml.match(/<\/(?:[A-Za-z_][\w.-]*:)?coreProperties>/i);
    if (!cierre || cierre.index === undefined) {
      throw new BadRequestException(
        'No se pudo insertar la firma en docProps/core.xml.',
      );
    }
    const etiqueta = `${prefijoCore}keywords`;
    const contenido = this.combinarConFirma('', valorFirma);
    return (
      xml.slice(0, cierre.index) +
      `<${etiqueta}>${this.escapeXml(contenido)}</${etiqueta}>` +
      xml.slice(cierre.index)
    );
  }

  /** Conserva palabras clave/descripción previas y reemplaza la firma SIAC anterior. */
  private combinarConFirma(
    contenidoXmlCrudo: string,
    valorFirma: string,
  ): string {
    const decodificado = this.desescaparXml(contenidoXmlCrudo).trim();
    const partes = decodificado
      .split(';')
      .map((parte) => parte.trim())
      .filter((parte) => parte && !parte.startsWith(PREFIJO_FIRMA_CORE));
    partes.push(`${PREFIJO_FIRMA_CORE}${valorFirma}`);
    return partes.join('; ');
  }

  private resolverPrefijo(xml: string, namespace: string): string | null {
    const escapado = this.escapeRegExp(namespace);
    const conPrefijo = xml.match(
      new RegExp(`xmlns:([A-Za-z_][\\w.-]*)="${escapado}"`, 'i'),
    );
    if (conPrefijo) return `${conPrefijo[1]}:`;
    if (new RegExp(`xmlns="${escapado}"`, 'i').test(xml)) return '';
    return null;
  }

  async extraerTextoPlano(buffer: Buffer): Promise<string> {
    const resultado = await mammoth.extractRawText({ buffer });
    return this.normalizarTexto(resultado.value);
  }

  async procesarDocxPostDictamen(
    bufferEntrada: Buffer,
    evidenciaId: string,
    numeroVersion: number,
    zonas: ZonaCorreccionEntrada[],
  ): Promise<ResultadoProcesamientoDocx> {
    this.validarEsDocxZip(bufferEntrada);
    let buffer = bufferEntrada;

    if (zonas.length > 0) {
      buffer = await this.agregarZonasCorreccionAlDocumento(buffer, zonas);
    }

    const firmaDescarga = this.generarValorFirma(evidenciaId, numeroVersion);
    buffer = await this.escribirFirmaEnCore(buffer, firmaDescarga);

    const textoBaseAuditoria = await this.extraerTextoPlano(buffer);

    return { buffer, firmaDescarga, textoBaseAuditoria };
  }

  /**
   * Valida únicamente que la re-subida sea el documento firmado por el sistema.
   * La edición del contenido es libre: ya no se restringe a áreas permitidas.
   */
  async validarFirmaSubida(
    bufferSubido: Buffer,
    firmaEsperada: string | null | undefined,
  ): Promise<void> {
    this.validarEsDocxZip(bufferSubido);

    const firmaLeida = await this.leerFirmaDocumento(bufferSubido);
    if (!firmaEsperada) {
      return;
    }
    if (!firmaLeida) {
      throw new BadRequestException(
        'Falta la firma de versión SIAC; descarga el documento desde SIAC y vuelve a subirlo.',
      );
    }
    if (firmaLeida !== firmaEsperada) {
      throw new BadRequestException(
        'La firma no coincide con la última descarga de esta evidencia.',
      );
    }
  }

  /** Diff de contenido entre dos versiones .docx (texto por párrafos + inventario de media). */
  async compararVersiones(
    bufferA: Buffer,
    bufferB: Buffer,
  ): Promise<ResultadoDiffDocx> {
    this.validarEsDocxZip(bufferA);
    this.validarEsDocxZip(bufferB);

    const parrafosA = await this.extraerParrafos(bufferA);
    const parrafosB = await this.extraerParrafos(bufferB);
    const { lineas, agregadas, eliminadas } = this.diffLineas(parrafosA, parrafosB);
    const hunks = this.construirHunks(lineas);
    const media = await this.inventarioMedia(bufferA, bufferB);

    return {
      agregadas,
      eliminadas,
      sinCambios:
        agregadas === 0 &&
        eliminadas === 0 &&
        media.every((item) => item.estado === 'sinCambios'),
      lineas,
      hunks,
      media,
    };
  }

  private async extraerParrafos(buffer: Buffer): Promise<string[]> {
    const zip = await JSZip.loadAsync(buffer);
    const documento = zip.file('word/document.xml');
    if (!documento) {
      throw new BadRequestException('El .docx no contiene word/document.xml.');
    }
    const xml = await documento.async('string');
    const parrafos: string[] = [];
    const patron = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>|<w:p\b[^>]*\/>/gi;
    let coincidencia: RegExpExecArray | null;
    while ((coincidencia = patron.exec(xml)) !== null) {
      const texto = this.textoDeParrafo(coincidencia[1] ?? '');
      if (texto.trim()) parrafos.push(texto);
    }
    return parrafos;
  }

  private textoDeParrafo(contenido: string): string {
    let texto = '';
    const patron = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/gi;
    let coincidencia: RegExpExecArray | null;
    while ((coincidencia = patron.exec(contenido)) !== null) {
      if (coincidencia[1] !== undefined) {
        texto += this.desescaparXml(coincidencia[1]);
      } else if (/^<w:tab/i.test(coincidencia[0])) {
        texto += '\t';
      } else {
        texto += ' ';
      }
    }
    return texto.replace(/\s+/g, ' ').trim();
  }

  private diffLineas(
    antes: string[],
    despues: string[],
  ): { lineas: LineaDiff[]; agregadas: number; eliminadas: number } {
    let inicio = 0;
    while (
      inicio < antes.length &&
      inicio < despues.length &&
      antes[inicio] === despues[inicio]
    ) {
      inicio += 1;
    }

    let finAntes = antes.length;
    let finDespues = despues.length;
    while (
      finAntes > inicio &&
      finDespues > inicio &&
      antes[finAntes - 1] === despues[finDespues - 1]
    ) {
      finAntes -= 1;
      finDespues -= 1;
    }

    const lineas: LineaDiff[] = [];
    for (let i = 0; i < inicio; i += 1) {
      lineas.push({
        tipo: 'contexto',
        texto: antes[i],
        numeroAntes: i + 1,
        numeroDespues: i + 1,
      });
    }

    const operaciones = this.lcsOperaciones(
      antes.slice(inicio, finAntes),
      despues.slice(inicio, finDespues),
    );

    let numeroAntes = inicio;
    let numeroDespues = inicio;
    let agregadas = 0;
    let eliminadas = 0;

    for (const operacion of operaciones) {
      if (operacion.tipo === 'igual') {
        lineas.push({
          tipo: 'contexto',
          texto: operacion.texto,
          numeroAntes: numeroAntes + 1,
          numeroDespues: numeroDespues + 1,
        });
        numeroAntes += 1;
        numeroDespues += 1;
      } else if (operacion.tipo === 'eliminado') {
        lineas.push({
          tipo: 'eliminado',
          texto: operacion.texto,
          numeroAntes: numeroAntes + 1,
          numeroDespues: null,
        });
        numeroAntes += 1;
        eliminadas += 1;
      } else {
        lineas.push({
          tipo: 'agregado',
          texto: operacion.texto,
          numeroAntes: null,
          numeroDespues: numeroDespues + 1,
        });
        numeroDespues += 1;
        agregadas += 1;
      }
    }

    for (let i = finAntes; i < antes.length; i += 1) {
      const desplazamiento = i - finAntes;
      lineas.push({
        tipo: 'contexto',
        texto: antes[i],
        numeroAntes: i + 1,
        numeroDespues: finDespues + desplazamiento + 1,
      });
    }

    return { lineas, agregadas, eliminadas };
  }

  private lcsOperaciones(
    antes: string[],
    despues: string[],
  ): { tipo: 'igual' | 'eliminado' | 'agregado'; texto: string }[] {
    const n = antes.length;
    const m = despues.length;

    if (n === 0) {
      return despues.map((texto) => ({ tipo: 'agregado' as const, texto }));
    }
    if (m === 0) {
      return antes.map((texto) => ({ tipo: 'eliminado' as const, texto }));
    }
    if (n * m > 4_000_000) {
      return [
        ...antes.map((texto) => ({ tipo: 'eliminado' as const, texto })),
        ...despues.map((texto) => ({ tipo: 'agregado' as const, texto })),
      ];
    }

    const ancho = m + 1;
    const dp = new Int32Array((n + 1) * ancho);
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[i * ancho + j] =
          antes[i] === despues[j]
            ? dp[(i + 1) * ancho + (j + 1)] + 1
            : Math.max(dp[(i + 1) * ancho + j], dp[i * ancho + (j + 1)]);
      }
    }

    const operaciones: {
      tipo: 'igual' | 'eliminado' | 'agregado';
      texto: string;
    }[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (antes[i] === despues[j]) {
        operaciones.push({ tipo: 'igual', texto: antes[i] });
        i += 1;
        j += 1;
      } else if (dp[(i + 1) * ancho + j] >= dp[i * ancho + (j + 1)]) {
        operaciones.push({ tipo: 'eliminado', texto: antes[i] });
        i += 1;
      } else {
        operaciones.push({ tipo: 'agregado', texto: despues[j] });
        j += 1;
      }
    }
    while (i < n) {
      operaciones.push({ tipo: 'eliminado', texto: antes[i] });
      i += 1;
    }
    while (j < m) {
      operaciones.push({ tipo: 'agregado', texto: despues[j] });
      j += 1;
    }
    return operaciones;
  }

  private construirHunks(lineas: LineaDiff[], contexto = 3): HunkDiff[] {
    const indicesCambio = lineas
      .map((linea, indice) => (linea.tipo === 'contexto' ? -1 : indice))
      .filter((indice) => indice >= 0);
    if (indicesCambio.length === 0) return [];

    const grupos: { inicio: number; fin: number }[] = [];
    let inicio = indicesCambio[0];
    let fin = indicesCambio[0];
    for (let k = 1; k < indicesCambio.length; k += 1) {
      if (indicesCambio[k] - fin <= contexto * 2 + 1) {
        fin = indicesCambio[k];
      } else {
        grupos.push({ inicio, fin });
        inicio = indicesCambio[k];
        fin = indicesCambio[k];
      }
    }
    grupos.push({ inicio, fin });

    return grupos.map((grupo, indice) => {
      const desde = Math.max(0, grupo.inicio - contexto);
      const hasta = Math.min(lineas.length - 1, grupo.fin + contexto);
      const contenido = lineas.slice(desde, hasta + 1);
      const agregadas = contenido.filter((l) => l.tipo === 'agregado').length;
      const eliminadas = contenido.filter((l) => l.tipo === 'eliminado').length;
      const primerAntes = contenido.find((l) => l.numeroAntes !== null);
      const ultimoAntes = [...contenido].reverse().find((l) => l.numeroAntes !== null);
      const primerDespues = contenido.find((l) => l.numeroDespues !== null);
      const ultimoDespues = [...contenido]
        .reverse()
        .find((l) => l.numeroDespues !== null);
      const rangoAntes = this.rangoHunk(primerAntes?.numeroAntes, ultimoAntes?.numeroAntes);
      const rangoDespues = this.rangoHunk(
        primerDespues?.numeroDespues,
        ultimoDespues?.numeroDespues,
      );
      return {
        id: `hunk-${indice + 1}`,
        encabezado: `@@ -${rangoAntes} +${rangoDespues} @@`,
        indiceInicio: desde,
        lineas: contenido,
        agregadas,
        eliminadas,
      };
    });
  }

  private rangoHunk(inicio?: number | null, fin?: number | null): string {
    if (inicio === undefined || inicio === null) return '0,0';
    const total = (fin ?? inicio) - inicio + 1;
    return `${inicio},${total}`;
  }

  private async inventarioMedia(
    bufferA: Buffer,
    bufferB: Buffer,
  ): Promise<MediaDiff[]> {
    const [zipA, zipB] = await Promise.all([
      JSZip.loadAsync(bufferA),
      JSZip.loadAsync(bufferB),
    ]);
    const mediaA = await this.mapaMedia(zipA);
    const mediaB = await this.mapaMedia(zipB);

    const partes = new Set<string>([...mediaA.keys(), ...mediaB.keys()]);
    const lista: MediaDiff[] = [];
    for (const part of [...partes].sort()) {
      const a = mediaA.get(part);
      const b = mediaB.get(part);
      if (a && b) {
        lista.push({
          part,
          estado: a.hash === b.hash ? 'sinCambios' : 'modificado',
          hashAntes: a.hash,
          hashDespues: b.hash,
          tamanoAntes: a.tamano,
          tamanoDespues: b.tamano,
        });
      } else if (b) {
        lista.push({
          part,
          estado: 'agregado',
          hashDespues: b.hash,
          tamanoDespues: b.tamano,
        });
      } else if (a) {
        lista.push({
          part,
          estado: 'eliminado',
          hashAntes: a.hash,
          tamanoAntes: a.tamano,
        });
      }
    }
    return lista;
  }

  private async mapaMedia(
    zip: JSZip,
  ): Promise<Map<string, { hash: string; tamano: number }>> {
    const mapa = new Map<string, { hash: string; tamano: number }>();
    for (const [ruta, archivo] of Object.entries(zip.files)) {
      if (archivo.dir) continue;
      if (!/(^|\/)media\//i.test(ruta)) continue;
      const bytes = await archivo.async('nodebuffer');
      mapa.set(ruta, {
        hash: createHash('sha256').update(bytes).digest('hex'),
        tamano: bytes.length,
      });
    }
    return mapa;
  }

  private async leerFirmaDesdeCore(zip: JSZip): Promise<string | null> {
    const core = zip.file(RUTA_CORE);
    if (!core) return null;
    const xml = await core.async('string');
    return (
      this.extraerFirmaDeEtiqueta(xml, 'keywords') ??
      this.extraerFirmaDeEtiqueta(xml, 'description')
    );
  }

  private extraerFirmaDeEtiqueta(
    xml: string,
    nombreLocal: string,
  ): string | null {
    const bloque = new RegExp(
      `<(?:[A-Za-z_][\\w.-]*:)?${nombreLocal}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${nombreLocal}>`,
      'i',
    ).exec(xml);
    if (!bloque) return null;
    const valor = this.desescaparXml(bloque[1]);
    const parte = valor
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith(PREFIJO_FIRMA_CORE));
    return parte ? parte.slice(PREFIJO_FIRMA_CORE.length) : null;
  }

  private async leerFirmaDesdeCustom(zip: JSZip): Promise<string | null> {
    const custom = zip.file('docProps/custom.xml');
    if (!custom) return null;
    const xml = await custom.async('string');
    const match = xml.match(
      new RegExp(
        `name="${PROPIEDAD_FIRMA_SIAC}"[^>]*>\\s*<vt:lpwstr>([^<]*)</vt:lpwstr>`,
        'i',
      ),
    );
    return match?.[1]?.trim() ?? null;
  }

  /**
   * Añade párrafos de corrección sin permisos ni protección global.
   * Word exige que w:sectPr sea el último hijo de w:body.
   */
  private async agregarZonasCorreccionAlDocumento(
    buffer: Buffer,
    zonas: ZonaCorreccionEntrada[],
  ): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buffer);
    const documentoPath = 'word/document.xml';
    const docFile = zip.file(documentoPath);
    if (!docFile) {
      throw new BadRequestException('El .docx no contiene word/document.xml.');
    }

    let documentXml = await docFile.async('string');
    const insercion = zonas.map((z) => this.construirBloqueZonaCorreccion(z)).join('');
    documentXml = this.insertarAntesDeSectPr(documentXml, insercion);

    zip.file(documentoPath, documentXml);
    await this.validarPartesContentTypes(zip);
    return Buffer.from(await zip.generateAsync(OPCIONES_GENERAR_ZIP));
  }

  private insertarAntesDeSectPr(documentXml: string, insercion: string): string {
    const indiceSectPr = this.buscarIndiceSectPr(documentXml);
    if (indiceSectPr >= 0) {
      return (
        documentXml.slice(0, indiceSectPr) +
        insercion +
        documentXml.slice(indiceSectPr)
      );
    }

    if (documentXml.includes('</w:body>')) {
      return documentXml.replace('</w:body>', `${insercion}</w:body>`);
    }

    throw new BadRequestException('Estructura de documento Word no reconocida.');
  }

  private buscarIndiceSectPr(documentXml: string): number {
    const patrones = [
      /<w:sectPr\b[\s\S]*?<\/w:sectPr>/,
      /<w:sectPr\b[^>]*\/>/,
    ];
    for (const patron of patrones) {
      const coincidencia = documentXml.match(patron);
      if (coincidencia?.index !== undefined) {
        return coincidencia.index;
      }
    }
    return -1;
  }

  private construirBloqueZonaCorreccion(zona: ZonaCorreccionEntrada): string {
    const textoObs =
      this.escapeXml(zona.observacion.trim()) ||
      'Complete la corrección en esta sección.';
    const etiqueta = this.escapeXml(zona.etiqueta);
    return (
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Zona de corrección — ${etiqueta}</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t xml:space="preserve">${textoObs}</w:t></w:r></w:p>`
    );
  }

  private async validarPartesContentTypes(zip: JSZip): Promise<void> {
    const contentTypes = zip.file('[Content_Types].xml');
    if (!contentTypes) {
      throw new BadRequestException(
        'El paquete OOXML no contiene [Content_Types].xml.',
      );
    }
    const xml = await contentTypes.async('string');
    const partes = [
      ...xml.matchAll(/PartName="([^"]+)"/g),
    ].map((coincidencia) => coincidencia[1].replace(/^\//, ''));

    for (const parte of partes) {
      if (!zip.file(parte)) {
        throw new BadRequestException(
          `El manifiesto OOXML referencia una parte inexistente: ${parte}`,
        );
      }
    }
  }

  private normalizarTexto(texto: string): string {
    return texto.replace(/\s+/g, ' ').trim();
  }

  private escapeXml(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private desescaparXml(texto: string): string {
    return texto
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private escapeRegExp(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Inyecta comentarios nativos de Word (w:comments) anclados al texto que coincide
   * con el quote. Crea word/comments.xml + rel + override de Content_Types solo si
   * hay al menos un ancla colocada. No toca docProps/core.xml (firma intacta).
   */
  async inyectarComentariosWord(
    buffer: Buffer,
    comentarios: ComentarioWordEntrada[],
  ): Promise<ResultadoInyeccionComentarios> {
    const validos = (comentarios ?? []).filter(
      (c) => c.quote?.trim() && c.body?.trim(),
    );
    if (validos.length === 0) {
      return { buffer, inyectados: 0, omitidos: 0 };
    }

    const zip = await JSZip.loadAsync(buffer);
    if (!zip.file('word/document.xml')) {
      throw new BadRequestException('El .docx no contiene word/document.xml.');
    }

    // Base limpia: evita IDs duplicados o anclas previas (p. ej. si el cargador
    // re-subió el archivo ya anotado en un ciclo anterior).
    await this.limpiarComentariosWord(zip);

    let documentXml = await zip.file('word/document.xml')!.async('string');
    const colocados: { id: number; entrada: ComentarioWordEntrada }[] = [];
    let omitidos = 0;
    let idActual = 1;

    for (const entrada of validos) {
      const marcado = this.marcarCitaEnDocumento(
        documentXml,
        entrada.quote.trim(),
        idActual,
      );
      if (!marcado) {
        omitidos += 1;
        continue;
      }
      documentXml = marcado;
      colocados.push({ id: idActual, entrada });
      idActual += 1;
    }

    if (colocados.length === 0) {
      return { buffer, inyectados: 0, omitidos };
    }

    this.validarAnclasComentarios(documentXml, colocados.length);

    zip.file('word/document.xml', documentXml);
    await this.asegurarRelacionComentarios(zip);
    await this.asegurarOverrideComentarios(zip);
    await this.escribirComentariosXml(zip, colocados);
    await this.validarPartesContentTypes(zip);

    return {
      buffer: Buffer.from(await zip.generateAsync(OPCIONES_GENERAR_ZIP)),
      inyectados: colocados.length,
      omitidos,
    };
  }

  private validarAnclasComentarios(
    documentXml: string,
    esperados: number,
  ): void {
    const inicios = (documentXml.match(/<w:commentRangeStart\b/g) ?? []).length;
    const fines = (documentXml.match(/<w:commentRangeEnd\b/g) ?? []).length;
    const referencias = (documentXml.match(/<w:commentReference\b/g) ?? [])
      .length;
    if (
      inicios !== esperados ||
      fines !== esperados ||
      referencias !== esperados
    ) {
      throw new BadRequestException(
        'No se pudieron anclar los comentarios de forma segura; se canceló la generación para no dañar el documento.',
      );
    }
  }

  /** Elimina comentarios y anclas previas para inyectar un set limpio y único. */
  private async limpiarComentariosWord(zip: JSZip): Promise<void> {
    const documento = zip.file('word/document.xml');
    if (documento) {
      let xml = await documento.async('string');
      xml = xml.replace(/<w:commentRangeStart\b[^>]*\/>/g, '');
      xml = xml.replace(/<w:commentRangeEnd\b[^>]*\/>/g, '');
      xml = xml.replace(
        /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:commentReference\b[^>]*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g,
        '',
      );
      zip.file('word/document.xml', xml);
    }

    if (zip.file('word/comments.xml')) {
      zip.remove('word/comments.xml');
    }

    const rels = zip.file('word/_rels/document.xml.rels');
    if (rels) {
      let xml = await rels.async('string');
      xml = xml.replace(
        /<Relationship\b[^>]*Type="[^"]*\/comments"[^>]*\/>/g,
        '',
      );
      zip.file('word/_rels/document.xml.rels', xml);
    }

    const contentTypes = zip.file('[Content_Types].xml');
    if (contentTypes) {
      let xml = await contentTypes.async('string');
      xml = xml.replace(
        /<Override\b[^>]*PartName="\/word\/comments\.xml"[^>]*\/>/g,
        '',
      );
      zip.file('[Content_Types].xml', xml);
    }
  }

  private marcarCitaEnDocumento(
    xml: string,
    quote: string,
    id: number,
  ): string | null {
    for (const variante of this.variantesCita(quote)) {
      const patron = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
      let coincidencia: RegExpExecArray | null;
      while ((coincidencia = patron.exec(xml)) !== null) {
        const marcado = this.marcarCitaEnParrafo(coincidencia[0], variante, id);
        if (marcado) {
          return (
            xml.slice(0, coincidencia.index) +
            marcado +
            xml.slice(coincidencia.index + coincidencia[0].length)
          );
        }
      }
    }
    return null;
  }

  /** Variantes estables para citas largas: completa y recortes por palabra. */
  private variantesCita(quote: string): string[] {
    const variantes = [quote];
    for (const limite of [90, 60, 40, 24]) {
      if (quote.length <= limite) continue;
      const recorte = quote.slice(0, limite);
      const ultimaPalabra = recorte.lastIndexOf(' ');
      if (ultimaPalabra > 12) {
        variantes.push(recorte.slice(0, ultimaPalabra).trim());
      }
    }
    return [...new Set(variantes.filter((v) => v.length >= 8))];
  }

  private marcarCitaEnParrafo(
    parrafo: string,
    quote: string,
    id: number,
  ): string | null {
    const corridas: { inicio: number; fin: number; texto: string }[] = [];
    const patron = /<w:r\b[^>]*>[\s\S]*?<\/w:r>|<w:r\b[^>]*\/>/g;
    let coincidencia: RegExpExecArray | null;
    while ((coincidencia = patron.exec(parrafo)) !== null) {
      corridas.push({
        inicio: coincidencia.index,
        fin: coincidencia.index + coincidencia[0].length,
        texto: this.textoCrudoDeRun(coincidencia[0]),
      });
    }
    if (corridas.length === 0) return null;

    const crudo = corridas.map((c) => c.texto).join('');
    if (!crudo) return null;

    const mapa = this.mapaNormalizado(crudo);
    const idx = mapa.normalizado.indexOf(quote);
    if (idx < 0) return null;

    const indiceFin = Math.min(
      idx + quote.length - 1,
      mapa.aCrudo.length - 1,
    );
    const crudoInicio = mapa.aCrudo[idx];
    const crudoFin = mapa.aCrudo[indiceFin] + 1;

    const corridaInicio = corridas.findIndex(
      (c) => c.fin > crudoInicio,
    );
    let corridaFin = -1;
    for (let i = corridas.length - 1; i >= 0; i -= 1) {
      if (corridas[i].inicio < crudoFin) {
        corridaFin = i;
        break;
      }
    }
    if (corridaInicio < 0 || corridaFin < corridaInicio) return null;

    const apertura = `<w:commentRangeStart w:id="${id}"/>`;
    const cierre = `<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>`;

    return (
      parrafo.slice(0, corridas[corridaInicio].inicio) +
      apertura +
      parrafo.slice(corridas[corridaInicio].inicio, corridas[corridaFin].fin) +
      cierre +
      parrafo.slice(corridas[corridaFin].fin)
    );
  }

  private textoCrudoDeRun(runXml: string): string {
    let texto = '';
    const patron = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/gi;
    let coincidencia: RegExpExecArray | null;
    while ((coincidencia = patron.exec(runXml)) !== null) {
      if (coincidencia[1] !== undefined) {
        texto += this.desescaparXml(coincidencia[1]);
      } else if (/^<w:tab/i.test(coincidencia[0])) {
        texto += '\t';
      } else {
        texto += ' ';
      }
    }
    return texto;
  }

  private mapaNormalizado(crudo: string): {
    normalizado: string;
    aCrudo: number[];
  } {
    let normalizado = '';
    const aCrudo: number[] = [];
    const esEspacio = (caracter: string) =>
      /\s/.test(caracter) || caracter === '\u00ad' || caracter === '\u200b';
    let enEspacio = false;
    for (let i = 0; i < crudo.length; i += 1) {
      const caracter = crudo[i];
      if (esEspacio(caracter)) {
        if (!enEspacio) {
          normalizado += ' ';
          aCrudo.push(i);
          enEspacio = true;
        }
      } else {
        normalizado += caracter;
        aCrudo.push(i);
        enEspacio = false;
      }
    }
    return { normalizado, aCrudo };
  }

  private async asegurarRelacionComentarios(zip: JSZip): Promise<void> {
    const ruta = 'word/_rels/document.xml.rels';
    const archivo = zip.file(ruta);
    let xml = archivo
      ? await archivo.async('string')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    const tipo =
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';
    if (xml.includes(tipo)) {
      zip.file(ruta, xml);
      return;
    }

    let id = 'rIdComentariosSiac';
    if (xml.includes(`Id="${id}"`)) {
      id = `rIdComentariosSiac${Date.now()}`;
    }
    xml = xml.replace(
      '</Relationships>',
      `<Relationship Id="${id}" Type="${tipo}" Target="comments.xml"/></Relationships>`,
    );
    zip.file(ruta, xml);
  }

  private async asegurarOverrideComentarios(zip: JSZip): Promise<void> {
    const archivo = zip.file('[Content_Types].xml');
    if (!archivo) return;
    let xml = await archivo.async('string');
    if (xml.includes('/word/comments.xml')) return;
    const override =
      '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>';
    xml = xml.replace('</Types>', `${override}</Types>`);
    zip.file('[Content_Types].xml', xml);
  }

  private async escribirComentariosXml(
    zip: JSZip,
    colocados: { id: number; entrada: ComentarioWordEntrada }[],
  ): Promise<void> {
    const ruta = 'word/comments.xml';
    const nuevos = colocados
      .map((c) => this.generarCommentXml(c.id, c.entrada))
      .join('');
    const existente = zip.file(ruta);
    if (existente) {
      let xml = await existente.async('string');
      xml = xml.replace('</w:comments>', `${nuevos}</w:comments>`);
      zip.file(ruta, xml);
      return;
    }
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${nuevos}</w:comments>`;
    zip.file(ruta, xml);
  }

  private generarCommentXml(id: number, entrada: ComentarioWordEntrada): string {
    const autor = this.limpiarTextoXml(
      entrada.autor?.trim() || 'Revisor SIAC',
    );
    const iniciales = this.inicialesAutor(autor);
    const fecha = new Date().toISOString();
    const lineas = this.limpiarTextoXml(entrada.body).split(/\r?\n/);
    const parrafos = (lineas.length > 0 ? lineas : [''])
      .map(
        (linea) =>
          `<w:p><w:r><w:t xml:space="preserve">${this.escapeXml(linea)}</w:t></w:r></w:p>`,
      )
      .join('');
    return `<w:comment w:id="${id}" w:author="${this.escapeXml(autor)}" w:initials="${this.escapeXml(iniciales)}" w:date="${fecha}">${parrafos}</w:comment>`;
  }

  private inicialesAutor(autor: string): string {
    const iniciales = autor
      .split(/\s+/)
      .filter(Boolean)
      .map((palabra) => palabra[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 9);
    return iniciales || 'RS';
  }

  /** Quita caracteres no válidos en XML 1.0 (control chars) para no corromper el part. */
  private limpiarTextoXml(texto: string): string {
    return texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  }
}
