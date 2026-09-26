import JSZip from 'jszip';

import { ServicioManipulacionDocx } from './servicio-manipulacion-docx.service';

async function crearDocxMinimo(texto: string, conSectPr = true): Promise<Buffer> {
  const sectPr = conSectPr
    ? '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>'
    : '';
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Prueba SIAC</dc:title>
</cp:coreProperties>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
});
