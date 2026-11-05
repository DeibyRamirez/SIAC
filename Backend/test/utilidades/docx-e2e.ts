import JSZip from 'jszip';

/** .docx mínimo y válido (ZIP con word/document.xml) para las pruebas E2E de carga. */
export async function crearDocxE2E(texto: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );
  // Word siempre incluye docProps/core.xml; el dictamen escribe ahí la firma SIAC.
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Prueba E2E</dc:title></cp:coreProperties>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const LIMITE_DOCX_BYTES = 20 * 1024 * 1024;

/**
 * .docx válido cuyo tamaño en bytes es el indicado (± pocos bytes por cabeceras ZIP).
 * Usado en E2E de valores límite (20 MB − 1 B, 20 MB, 20 MB + 1 B).
 */
export async function crearDocxE2EConTamanoBytes(tamanoObjetivo: number): Promise<Buffer> {
  if (tamanoObjetivo > LIMITE_DOCX_BYTES + 512 * 1024) {
    throw new Error('Tamano fuera del rango de prueba de límite 20 MB');
  }
  let padding = Math.max(0, tamanoObjetivo - 900);
  for (let intento = 0; intento < 8; intento++) {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
    );
    zip.file(
      'docProps/core.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Prueba límite</dc:title></cp:coreProperties>`,
    );
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>limite</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    );
    if (padding > 0) {
      zip.file('word/embeddings/pad.bin', Buffer.alloc(padding, 0x41), { compression: 'STORE' });
    }
    const buffer = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    const delta = tamanoObjetivo - buffer.length;
    if (delta === 0) return buffer;
    padding += delta;
  }
  throw new Error(`No se pudo generar .docx de ${tamanoObjetivo} bytes`);
}

export { LIMITE_DOCX_BYTES };
