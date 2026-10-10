import { motivoRechazoPdf, TAMANO_MAXIMO_RESOLUCION } from './archivo-pdf';

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

function archivo(parcial: Partial<{ originalname: string; mimetype: string; buffer: Buffer; size: number }> = {}) {
  const buffer = parcial.buffer ?? PDF;
  return { originalname: 'Resolución 1234.pdf', mimetype: 'application/pdf', buffer, size: buffer.length, ...parcial };
}

describe('motivoRechazoPdf (resolución MEN)', () => {
  it('acepta un PDF real', () => {
    expect(motivoRechazoPdf(archivo())).toBeNull();
  });

  it('rechaza un .docx aunque diga ser PDF y un PDF falso (sin firma %PDF)', () => {
    expect(motivoRechazoPdf(archivo({ originalname: 'resolucion.docx' }))).toMatch(/\.pdf/);
    expect(motivoRechazoPdf(archivo({ buffer: DOCX }))).toMatch(/no es un PDF válido/);
  });

  it('rechaza MIME distinto de application/pdf', () => {
    expect(motivoRechazoPdf(archivo({ mimetype: 'application/octet-stream' }))).toMatch(/application\/pdf/);
  });

  it('respeta el límite de tamaño', () => {
    expect(motivoRechazoPdf(archivo({ size: TAMANO_MAXIMO_RESOLUCION + 1 }))).toMatch(/20 MB/);
  });
});
