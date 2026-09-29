import JSZip from 'jszip';

import { ServicioManipulacionDocx } from './servicio-manipulacion-docx.service';

const CABECERA_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const CORE_XML_POR_DEFECTO = `${CABECERA_XML}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Prueba SIAC</dc:title>
</cp:coreProperties>`;

async function crearDocxMinimo(
  texto: string,
  conSectPr = true,
  coreXml = CORE_XML_POR_DEFECTO,
): Promise<Buffer> {
  const sectPr = conSectPr
    ? '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>'
    : '';
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `${CABECERA_XML}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );
  zip.file('docProps/core.xml', coreXml);
  zip.file(
    'word/document.xml',
    `${CABECERA_XML}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${texto}</w:t></w:r></w:p>
    ${sectPr}
  </w:body>
</w:document>`,
  );
  return Buffer.from(
    await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
  );
}

async function listarEntradas(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).sort();
}

function contar(ocurrencias: string, aguja: string): number {
  return ocurrencias.split(aguja).length - 1;
}

async function crearDocxConContenido(
  parrafos: string[],
  media: { nombre: string; contenido: Buffer }[] = [],
  conCore = true,
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `${CABECERA_XML}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );
  if (conCore) {
    zip.file('docProps/core.xml', CORE_XML_POR_DEFECTO);
  }
  const cuerpo = parrafos
    .map(
      (texto) =>
        `<w:p><w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`,
    )
    .join('');
  zip.file(
    'word/document.xml',
    `${CABECERA_XML}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${cuerpo}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body>
</w:document>`,
  );
  for (const archivo of media) {
    zip.file(`word/media/${archivo.nombre}`, archivo.contenido);
  }
  return Buffer.from(
    await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
  );
}

describe('ServicioManipulacionDocx', () => {
  const servicio = new ServicioManipulacionDocx();

  it('rechaza buffer que no es ZIP', () => {
    expect(() => servicio.validarEsDocxZip(Buffer.from('hola'))).toThrow();
  });

  it('escribe y lee firma en docProps/core.xml sin tocar Content_Types', async () => {
    const docx = await crearDocxMinimo('Contenido base');
    const firma = servicio.generarValorFirma('ev-1', 2);
    const sellado = await servicio.escribirFirmaEnCore(docx, firma);
    const leida = await servicio.leerFirmaDocumento(sellado);
    expect(leida).toBe(firma);

    const zip = await JSZip.loadAsync(sellado);
    expect(zip.file('docProps/custom.xml')).toBeNull();
    const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
    expect(contentTypes).not.toContain('custom-properties');
    expect(await listarEntradas(sellado)).toEqual(await listarEntradas(docx));
  });

  it('crea cp:keywords cuando no existe y conserva la estructura del ZIP', async () => {
    const docx = await crearDocxMinimo('Sin keywords');
    const firma = servicio.generarValorFirma('ev-2', 1);
    const sellado = await servicio.escribirFirmaEnCore(docx, firma);

    const zip = await JSZip.loadAsync(sellado);
    const core = await zip.file('docProps/core.xml')!.async('string');
    expect(contar(core, '<cp:keywords')).toBe(1);
    expect(contar(core, '</cp:keywords>')).toBe(1);
    expect(core).toContain(`SIAC_FIRMA_VERSION=${firma}`);
    expect(core).toContain('<dc:title>Prueba SIAC</dc:title>');
    expect(core.startsWith('<?xml')).toBe(true);
    expect(zip.file('docProps/custom.xml')).toBeNull();
    expect(await listarEntradas(sellado)).toEqual(await listarEntradas(docx));
  });

  it('conserva palabras clave previas y reemplaza la firma anterior', async () => {
    const core = `${CABECERA_XML}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Prueba SIAC</dc:title>
  <cp:keywords>calidad; SIAC_FIRMA_VERSION=vieja</cp:keywords>
</cp:coreProperties>`;
    const docx = await crearDocxMinimo('Con keywords', true, core);
    const firma = servicio.generarValorFirma('ev-3', 7);
    const sellado = await servicio.escribirFirmaEnCore(docx, firma);

    const zip = await JSZip.loadAsync(sellado);
    const xml = await zip.file('docProps/core.xml')!.async('string');
    expect(contar(xml, '<cp:keywords')).toBe(1);
    expect(xml).toContain('calidad');
    expect(xml).not.toContain('SIAC_FIRMA_VERSION=vieja');
    expect(await servicio.leerFirmaDocumento(sellado)).toBe(firma);
  });

  it('soporta cp:keywords autocerrado sin duplicar el nodo', async () => {
    const core = `${CABECERA_XML}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Prueba SIAC</dc:title>
  <cp:keywords/>
</cp:coreProperties>`;
    const docx = await crearDocxMinimo('Autocerrado', true, core);
    const firma = servicio.generarValorFirma('ev-4', 1);
    const sellado = await servicio.escribirFirmaEnCore(docx, firma);

    const zip = await JSZip.loadAsync(sellado);
    const xml = await zip.file('docProps/core.xml')!.async('string');
    expect(contar(xml, '<cp:keywords')).toBe(1);
    expect(contar(xml, '</cp:keywords>')).toBe(1);
    expect(xml).not.toContain('/>');
    expect(await servicio.leerFirmaDocumento(sellado)).toBe(firma);
  });

  it('usa dc:description cuando no hay cp:keywords', async () => {
    const core = `${CABECERA_XML}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Prueba SIAC</dc:title>
  <dc:description>Descripción original</dc:description>
</cp:coreProperties>`;
    const docx = await crearDocxMinimo('Con descripción', true, core);
    const firma = servicio.generarValorFirma('ev-5', 3);
    const sellado = await servicio.escribirFirmaEnCore(docx, firma);

    const zip = await JSZip.loadAsync(sellado);
    const xml = await zip.file('docProps/core.xml')!.async('string');
    expect(contar(xml, '<cp:keywords')).toBe(0);
    expect(xml).toContain('Descripción original');
    expect(xml).toContain(`SIAC_FIRMA_VERSION=${firma}`);
    expect(await servicio.leerFirmaDocumento(sellado)).toBe(firma);
  });

  it('rechaza docx sin docProps/core.xml sin inventar el part', async () => {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      `${CABECERA_XML}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`,
    );
    zip.file('word/document.xml', `${CABECERA_XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`);
    const docx = Buffer.from(
      await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    );
    await expect(
      servicio.escribirFirmaEnCore(docx, servicio.generarValorFirma('ev-6', 1)),
    ).rejects.toThrow(/core\.xml/);
  });

  it('procesa dictamen con zona de corrección antes de w:sectPr', async () => {
    const docx = await crearDocxMinimo('Documento maestro');
    const resultado = await servicio.procesarDocxPostDictamen(
      docx,
      'ev-1',
      1,
      [
        {
          codigoCondicion: 'Denominacion',
          etiqueta: 'Denominación del programa',
          observacion: 'Ajustar título',
          idPermiso: 10,
        },
      ],
    );
    expect(resultado.firmaDescarga).toContain('ev-1:1:');
    expect(resultado.textoBaseAuditoria).toContain('Documento maestro');
    expect(resultado.textoBaseAuditoria).toContain('Zona de corrección');

    const zip = await JSZip.loadAsync(resultado.buffer);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    const cuerpo = documentXml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/)?.[1] ?? '';
    expect(cuerpo).toContain('Zona de corrección');
    expect(cuerpo).not.toContain('w:permStart');
    expect(cuerpo.trim().endsWith('</w:sectPr>'));
    const indiceZona = cuerpo.indexOf('Zona de corrección');
    const indiceSect = cuerpo.indexOf('<w:sectPr');
    expect(indiceZona).toBeGreaterThanOrEqual(0);
    expect(indiceSect).toBeGreaterThan(indiceZona);
  });

  it('permite cambios amplios fuera de zonas si la firma es válida', async () => {
    const original = await crearDocxConContenido(['Uno', 'Dos', 'Tres']);
    const firma = servicio.generarValorFirma('ev-7', 1);
    const firmado = await servicio.escribirFirmaEnCore(original, firma);

    const reescrito = await crearDocxConContenido([
      'Texto completamente nuevo',
      'Otro párrafo agregado',
      'Y otro más',
      'Sin relación con el original',
    ]);
    const reescritoFirmado = await servicio.escribirFirmaEnCore(reescrito, firma);

    await expect(
      servicio.validarFirmaSubida(reescritoFirmado, firma),
    ).resolves.toBeUndefined();
    await expect(
      servicio.validarFirmaSubida(firmado, firma),
    ).resolves.toBeUndefined();
  });

  it('rechaza la re-subida sin firma correcta', async () => {
    const sinFirma = await crearDocxConContenido(['Documento ajeno']);
    await expect(
      servicio.validarFirmaSubida(sinFirma, 'firma-esperada'),
    ).rejects.toThrow(/Falta la firma de versión SIAC/i);

    const otraFirma = await servicio.escribirFirmaEnCore(
      await crearDocxConContenido(['Otro documento']),
      'firma-distinta',
    );
    await expect(
      servicio.validarFirmaSubida(otraFirma, 'firma-esperada'),
    ).rejects.toThrow(/no coincide con la última descarga/i);
  });

  it('firma cada descarga con un token único y crea core.xml si falta', async () => {
    const docx = await crearDocxConContenido(['Documento sin core.xml'], [], false);
    const firmaA = servicio.generarValorFirma('ev-dup', 1);
    const firmaB = servicio.generarValorFirma('ev-dup', 1);
    expect(firmaA).not.toBe(firmaB);

    const descargaA = await servicio.firmarDescarga(docx, firmaA);
    expect(await servicio.leerFirmaDocumento(descargaA)).toBe(firmaA);

    const descargaB = await servicio.firmarDescarga(descargaA, firmaB);
    expect(await servicio.leerFirmaDocumento(descargaB)).toBe(firmaB);

    // La firma anterior ya no sirve tras re-descargar.
    await expect(
      servicio.validarFirmaSubida(descargaA, firmaB),
    ).rejects.toThrow(/no coincide con la última descarga/i);
    await expect(
      servicio.validarFirmaSubida(descargaB, firmaB),
    ).resolves.toBeUndefined();
  });

  it('no acepta firma de otra evidencia', async () => {
    const buffer = await servicio.firmarDescarga(
      await crearDocxConContenido(['Documento de la evidencia 1']),
      servicio.generarValorFirma('ev-1', 1),
    );
    await expect(
      servicio.validarFirmaSubida(buffer, servicio.generarValorFirma('ev-2', 1)),
    ).rejects.toThrow(/no coincide con la última descarga/i);
  });

  it('compara dos versiones: texto agregado/eliminado e inventario de imágenes', async () => {
    const versionA = await crearDocxConContenido(
      ['Párrafo uno', 'Párrafo dos', 'Párrafo tres'],
      [{ nombre: 'imagen1.png', contenido: Buffer.from('imagen-uno') }],
    );
    const versionB = await crearDocxConContenido(
      ['Párrafo uno', 'Párrafo dos corregido', 'Párrafo cuatro'],
      [{ nombre: 'imagen2.png', contenido: Buffer.from('imagen-dos') }],
    );

    const diff = await servicio.compararVersiones(versionA, versionB);
    expect(diff.sinCambios).toBe(false);
    expect(diff.agregadas).toBeGreaterThan(0);
    expect(diff.eliminadas).toBeGreaterThan(0);

    const textos = diff.hunks.flatMap((h) => h.lineas);
    expect(textos.some((l) => l.tipo === 'agregado')).toBe(true);
    expect(textos.some((l) => l.tipo === 'eliminado')).toBe(true);

    const agregada = diff.media.find((m) => m.part === 'word/media/imagen2.png');
    const eliminada = diff.media.find((m) => m.part === 'word/media/imagen1.png');
    expect(agregada?.estado).toBe('agregado');
    expect(eliminada?.estado).toBe('eliminado');
  });

  it('reporta sin cambios cuando ambas versiones son equivalentes', async () => {
    const versionA = await crearDocxConContenido(
      ['Mismo texto'],
      [{ nombre: 'imagen1.png', contenido: Buffer.from('igual') }],
    );
    const versionB = await crearDocxConContenido(
      ['Mismo texto'],
      [{ nombre: 'imagen1.png', contenido: Buffer.from('igual') }],
    );
    const diff = await servicio.compararVersiones(versionA, versionB);
    expect(diff.sinCambios).toBe(true);
    expect(diff.hunks).toHaveLength(0);
  });

  it('inyecta comentarios nativos de Word anclados al texto sin romper la firma', async () => {
    const base = await crearDocxConContenido([
      'El programa cumple con los requisitos de calidad exigidos.',
      'Segundo párrafo sin cambios.',
    ]);
    const firma = servicio.generarValorFirma('ev-comentario', 1);
    const firmado = await servicio.escribirFirmaEnCore(base, firma);

    const resultado = await servicio.inyectarComentariosWord(firmado, [
      {
        quote: 'requisitos de calidad',
        body: 'Aclarar este punto por favor.',
        autor: 'Revisor QA',
      },
    ]);

    expect(resultado.inyectados).toBe(1);
    expect(resultado.omitidos).toBe(0);

    const zip = await JSZip.loadAsync(resultado.buffer);
    const comments = await zip.file('word/comments.xml')!.async('string');
    expect(comments).toContain('Aclarar este punto por favor.');
    expect(comments).toContain('Revisor QA');

    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('<w:commentRangeStart w:id="1"/>');
    expect(documentXml).toContain('<w:commentRangeEnd w:id="1"/>');
    expect(documentXml).toContain('<w:commentReference w:id="1"/>');

    const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
    expect(contentTypes).toContain('/word/comments.xml');
    expect(contentTypes).toContain('wordprocessingml.comments+xml');

    const rels = await zip.file('word/_rels/document.xml.rels')!.async('string');
    expect(rels).toContain('relationships/comments');

    expect(await servicio.leerFirmaDocumento(resultado.buffer)).toBe(firma);
  });

  it('ancla comentarios que cruzan varios runs del mismo párrafo', async () => {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      `${CABECERA_XML}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
    );
    zip.file('docProps/core.xml', CORE_XML_POR_DEFECTO);
    zip.file(
      'word/document.xml',
      `${CABECERA_XML}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t xml:space="preserve">El programa </w:t></w:r><w:r><w:t xml:space="preserve">cumple los requisitos</w:t></w:r><w:r><w:t xml:space="preserve"> de calidad.</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`,
    );
    const docx = Buffer.from(
      await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    );

    const resultado = await servicio.inyectarComentariosWord(docx, [
      { quote: 'cumple los requisitos', body: 'Comentario cruzando runs.' },
    ]);
    expect(resultado.inyectados).toBe(1);
    const xml = await (
      await JSZip.loadAsync(resultado.buffer)
    ).file('word/document.xml')!.async('string');
    expect(xml).toContain('<w:commentRangeStart w:id="1"/>');
    expect(xml).toContain('<w:commentReference w:id="1"/>');
    expect(xml.indexOf('<w:commentRangeStart')).toBeLessThan(xml.indexOf('<w:commentReference'));
  });

  it('omite comentarios cuyo quote no existe sin corromper el ZIP', async () => {
    const docx = await crearDocxConContenido(['Texto conocido del documento']);
    const resultado = await servicio.inyectarComentariosWord(docx, [
      { quote: 'frase que no aparece en ninguna parte', body: 'No debe anclarse.' },
    ]);

    expect(resultado.inyectados).toBe(0);
    expect(resultado.omitidos).toBe(1);

    const zip = await JSZip.loadAsync(resultado.buffer);
    expect(zip.file('word/comments.xml')).toBeNull();
    expect(await listarEntradas(resultado.buffer)).toEqual(await listarEntradas(docx));
  });

  it('ancla citas largas usando un recorte estable', async () => {
    const base = await crearDocxConContenido([
      'El programa académico cumple con los requisitos de calidad exigidos por el decreto vigente.',
    ]);
    const quoteLargo =
      'El programa académico cumple con los requisitos de calidad exigidos por el decreto vigente y además incluye texto que no está en el documento.';

    const resultado = await servicio.inyectarComentariosWord(base, [
      { quote: quoteLargo, body: 'Cita larga con recorte.' },
    ]);
    expect(resultado.inyectados).toBe(1);
    const xml = await (
      await JSZip.loadAsync(resultado.buffer)
    ).file('word/document.xml')!.async('string');
    expect(xml).toContain('<w:commentRangeStart w:id="1"/>');
  });

  it('descarga real: comentarios anclados y firma válida para re-subida', async () => {
    const base = await crearDocxConContenido([
      'El programa cumple con los requisitos de calidad exigidos.',
    ]);
    const firma = servicio.generarValorFirma('ev-descarga', 1);

    const inyectado = await servicio.inyectarComentariosWord(base, [
      { quote: 'requisitos de calidad', body: 'Revisar esta frase.', autor: 'Revisor QA' },
    ]);
    const descarga = await servicio.firmarDescarga(inyectado.buffer, firma);

    const zip = await JSZip.loadAsync(descarga);
    expect(zip.file('word/comments.xml')).not.toBeNull();
    const doc = await zip.file('word/document.xml')!.async('string');
    expect(doc).toContain('<w:commentRangeStart');
    expect(await servicio.leerFirmaDocumento(descarga)).toBe(firma);
    await expect(
      servicio.validarFirmaSubida(descarga, firma),
    ).resolves.toBeUndefined();
  });

  it('inyecta 2 comentarios con autor y no duplica anclas al reinyectar', async () => {
    const base = await crearDocxConContenido([
      'El programa cumple con los requisitos de calidad.',
      'Segundo párrafo con observaciones.',
    ]);

    const primera = await servicio.inyectarComentariosWord(base, [
      { quote: 'requisitos de calidad', body: 'Corregir A', autor: 'Laura Ramírez' },
      { quote: 'Segundo párrafo', body: 'Corregir B', autor: 'Laura Ramírez' },
    ]);
    expect(primera.inyectados).toBe(2);
    expect(primera.omitidos).toBe(0);

    const zip = await JSZip.loadAsync(primera.buffer);
    const comments = await zip.file('word/comments.xml')!.async('string');
    expect((comments.match(/<w:comment /g) ?? []).length).toBe(2);
    expect(comments).toContain('Laura Ramírez');
    expect(comments).toContain('Corregir A');
    expect(comments).toContain('Corregir B');
    expect(comments).toContain('w:initials="LR"');

    // Reinyección sobre un archivo ya anotado: set limpio, sin duplicados.
    const segunda = await servicio.inyectarComentariosWord(primera.buffer, [
      { quote: 'requisitos de calidad', body: 'Nuevo A', autor: 'Laura Ramírez' },
    ]);
    const zip2 = await JSZip.loadAsync(segunda.buffer);
    const comments2 = await zip2.file('word/comments.xml')!.async('string');
    expect((comments2.match(/<w:comment /g) ?? []).length).toBe(1);
    expect(comments2).not.toContain('Corregir A');
    expect(comments2).toContain('Nuevo A');
    const doc2 = await zip2.file('word/document.xml')!.async('string');
    expect((doc2.match(/<w:commentRangeStart/g) ?? []).length).toBe(1);
    expect((doc2.match(/<w:commentReference/g) ?? []).length).toBe(1);
  });

  it('ancla N comentarios (cita corta y multi-párrafo) con w:date en hora Bogotá', async () => {
    const base = await crearDocxConContenido([
      'El estudiante David presenta el informe final.',
      'ANTECEDENTES NACIONALES',
      'ANTECEDENTE 1 (NACIONAL)',
    ]);

    const resultado = await servicio.inyectarComentariosWord(base, [
      {
        quote: 'David',
        body: 'Nombre completo',
        autor: 'Laura Ramírez',
        fecha: new Date('2026-09-29T23:10:11.149Z'),
      },
      {
        quote: 'ANTECEDENTES NACIONALESANTECEDENTE 1 (NACIONAL)',
        body: 'Duplicidad, dejar uno',
        autor: 'Laura Ramírez',
      },
      {
        quote: 'presenta el informe',
        body: 'Aclarar redacción',
        autor: 'Laura Ramírez',
      },
    ]);

    expect(resultado.inyectados).toBe(3);
    expect(resultado.omitidos).toBe(0);

    const zip = await JSZip.loadAsync(resultado.buffer);
    const comments = await zip.file('word/comments.xml')!.async('string');
    expect((comments.match(/<w:comment /g) ?? []).length).toBe(3);
    expect(comments).toContain('Nombre completo');
    expect(comments).toContain('Duplicidad, dejar uno');
    expect(comments).toContain('Aclarar redacción');
    // 23:10 UTC del 29-sep = 18:10 en America/Bogota (-05:00).
    expect(comments).toContain('w:date="2026-09-29T18:10:11-05:00"');

    const doc = await zip.file('word/document.xml')!.async('string');
    expect((doc.match(/<w:commentRangeStart/g) ?? []).length).toBe(3);
    expect((doc.match(/<w:commentRangeEnd/g) ?? []).length).toBe(3);
    expect((doc.match(/<w:commentReference/g) ?? []).length).toBe(3);
  });
});
