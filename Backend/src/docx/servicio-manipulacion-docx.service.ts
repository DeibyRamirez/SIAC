import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import JSZip from 'jszip';
import mammoth from 'mammoth';

import {
  PROPIEDAD_FIRMA_SIAC,
  ResultadoProcesamientoDocx,
  ZonaCorreccionEntrada,
} from './tipos-docx';

const PREFIJO_FIRMA_CORE = `${PROPIEDAD_FIRMA_SIAC}=`;

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
    const rutaCore = 'docProps/core.xml';
    const archivoCore = zip.file(rutaCore);
    if (!archivoCore) {
      throw new BadRequestException(
        'El documento no contiene docProps/core.xml; no se puede aplicar la firma SIAC.',
      );
    }

    let xml = await archivoCore.async('string');
    const valorFirmaEscapado = this.escapeXml(`${PREFIJO_FIRMA_CORE}${valorFirma}`);

    if (/<cp:keywords[\s>]/i.test(xml)) {
      const bloque = xml.match(/<cp:keywords[^>]*>([\s\S]*?)<\/cp:keywords>/i);
      const existente = bloque?.[1]?.trim() ?? '';
      const sinFirmaPrev = existente
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p && !p.startsWith(PREFIJO_FIRMA_CORE))
        .join('; ');
      const keywordsFinal = sinFirmaPrev
        ? `${sinFirmaPrev}; ${PREFIJO_FIRMA_CORE}${this.escapeXml(valorFirma)}`
        : valorFirmaEscapado;
      xml = xml.replace(
        /<cp:keywords[^>]*>[\s\S]*?<\/cp:keywords>/i,
        `<cp:keywords>${keywordsFinal}</cp:keywords>`,
      );
    } else if (xml.includes('</cp:coreProperties>')) {
      xml = xml.replace(
        '</cp:coreProperties>',
        `<cp:keywords>${valorFirmaEscapado}</cp:keywords></cp:coreProperties>`,
      );
    } else if (xml.includes('</coreProperties>')) {
      xml = xml.replace(
        '</coreProperties>',
        `<cp:keywords>${valorFirmaEscapado}</cp:keywords></coreProperties>`,
      );
    } else {
      throw new BadRequestException(
        'No se pudo insertar la firma en docProps/core.xml.',
      );
    }

    zip.file(rutaCore, xml);
    await this.validarPartesContentTypes(zip);
    return Buffer.from(await zip.generateAsync(OPCIONES_GENERAR_ZIP));
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

  async validarFirmaYDiff(
    bufferSubido: Buffer,
    firmaEsperada: string | null | undefined,
    textoBaseAuditoria: string | null | undefined,
    zonasEtiquetas: string[],
  ): Promise<void> {
    this.validarEsDocxZip(bufferSubido);

    const firmaLeida = await this.leerFirmaDocumento(bufferSubido);
    if (!firmaEsperada) {
      return;
    }
    if (!firmaLeida || firmaLeida !== firmaEsperada) {
      throw new BadRequestException(
        'Debe subir el mismo documento devuelto por el sistema (firma de versión no válida).',
      );
    }

    if (!textoBaseAuditoria?.trim()) {
      return;
    }

    const textoNuevo = await this.extraerTextoPlano(bufferSubido);
    if (!this.diffPermitido(textoBaseAuditoria, textoNuevo, zonasEtiquetas)) {
      throw new BadRequestException(
        'Se detectaron cambios fuera de las áreas permitidas de corrección.',
      );
    }
  }

  private async leerFirmaDesdeCore(zip: JSZip): Promise<string | null> {
    const core = zip.file('docProps/core.xml');
    if (!core) return null;
    const xml = await core.async('string');
    const bloque = xml.match(/<cp:keywords[^>]*>([\s\S]*?)<\/cp:keywords>/i);
    const valor = bloque?.[1]?.trim() ?? '';
    if (!valor.includes(PREFIJO_FIRMA_CORE)) return null;
    const parte = valor
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith(PREFIJO_FIRMA_CORE));
    if (!parte) return null;
    return parte.slice(PREFIJO_FIRMA_CORE.length);
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

  private diffPermitido(
    textoBase: string,
    textoNuevo: string,
    zonasEtiquetas: string[],
  ): boolean {
    const base = this.normalizarTexto(textoBase);
    const nuevo = this.normalizarTexto(textoNuevo);

    if (base === nuevo) return true;

    let baseRestante = base;
    let nuevoRestante = nuevo;

    for (const etiqueta of zonasEtiquetas) {
      const marcador = `Zona de corrección — ${etiqueta}`;
      const idxBase = baseRestante.indexOf(marcador);
      const idxNuevo = nuevoRestante.indexOf(marcador);
      if (idxBase === -1 && idxNuevo === -1) continue;

      const prefijoBase = idxBase >= 0 ? baseRestante.slice(0, idxBase) : baseRestante;
      const prefijoNuevo =
        idxNuevo >= 0 ? nuevoRestante.slice(0, idxNuevo) : nuevoRestante;

      if (prefijoBase !== prefijoNuevo) {
        return false;
      }

      if (idxBase >= 0) {
        baseRestante = baseRestante.slice(idxBase + marcador.length);
      }
      if (idxNuevo >= 0) {
        nuevoRestante = nuevoRestante.slice(idxNuevo + marcador.length);
      }
    }

    return baseRestante === nuevoRestante;
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
}
