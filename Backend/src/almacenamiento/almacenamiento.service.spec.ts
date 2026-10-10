import { ConfigService } from '@nestjs/config';
import { AlmacenamientoService } from './almacenamiento.service';
import { decodificarNombreArchivoMultipart } from './utilidades-nombre-archivo';

function servicioLocal() {
  return new AlmacenamientoService({
    get: (clave: string) => (clave === 'S3_USAR_ALMACEN_LOCAL' ? 'true' : undefined),
  } as unknown as ConfigService);
}

describe('AlmacenamientoService.generarClaveDocumento (R-D 3a)', () => {
  it('convierte nombre y carpeta con tildes, raya y espacios en una clave ASCII', () => {
    const clave = servicioLocal().generarClaveDocumento(
      'Infraestructura Física',
      'Certificado de bomberos — Sede Norte.pdf',
    );

    const anio = new Date().getFullYear();
    expect(clave).toMatch(
      new RegExp(
        `^documentos/${anio}/General/infraestructura-fisica/[0-9a-f-]{36}/Certificado-de-bomberos-Sede-Norte\\.pdf$`,
      ),
    );
    expect(/^[\x21-\x7e]+$/.test(clave)).toBe(true);
  });

  it('recupera nombres multipart en latin1 (mojibake) antes de sanear', () => {
    const mojibake = Buffer.from('Contratación sede ñ.docx', 'utf8').toString('latin1');
    const clave = servicioLocal().generarClaveDocumento('general', mojibake);
    expect(clave.endsWith('/Contratacion-sede-n.docx')).toBe(true);
  });

  it('una carpeta vacía o solo con símbolos cae en «general»', () => {
    const anio = new Date().getFullYear();
    expect(servicioLocal().generarClaveDocumento('  ¿?  ', 'a.pdf')).toMatch(
      new RegExp(`^documentos/${anio}/General/general/`),
    );
  });

  it('en modo local los buckets se reportan como existentes', async () => {
    const buckets = await servicioLocal().verificarBuckets();
    expect(buckets.map((b) => [b.tipo, b.existe])).toEqual([
      ['evidencias', true],
      ['plantillas', true],
      ['documentos', true],
    ]);
  });
});

describe('decodificarNombreArchivoMultipart', () => {
  it('recupera la raya «—» (3 bytes UTF-8) leída como latin1', () => {
    const mojibake = Buffer.from('Bomberos — Sede.pdf', 'utf8').toString('latin1');
    expect(decodificarNombreArchivoMultipart(mojibake)).toBe('Bomberos — Sede.pdf');
  });

  it('no altera un nombre que ya está bien decodificado', () => {
    expect(decodificarNombreArchivoMultipart('Contratación — Sede.pdf')).toBe('Contratación — Sede.pdf');
    expect(decodificarNombreArchivoMultipart('año.pdf')).toBe('año.pdf');
  });
});
