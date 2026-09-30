import * as ExcelJS from 'exceljs';
import { CodigoDocumentoGuia } from '@prisma/client';
import { IngestaService } from './ingesta.service';

async function excelConFilas(filas: string[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Evidencias');
  hoja.addRow(['nombre', 'programaCodigo', 'periodo', 'codigoGuia']);
  filas.forEach((fila) => hoja.addRow(fila));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('IngestaService columnas nombre/programa/periodo/codigoGuia', () => {
  const prisma = {
    programa: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    evidencia: { create: jest.fn() },
  };
  const servicio = new IngestaService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.programa.findUnique.mockResolvedValue({ id: 'prog-1' });
    prisma.usuario.findUnique.mockResolvedValue({ nombre: 'Cargador' });
  });

  it('crea la evidencia con la guía y marca checklist en G1', async () => {
    const buffer = await excelConFilas([['Maestro Derecho', 'DER', '2026-2', 'g1']]);

    const resultado = await servicio.parsearExcel(buffer, 'car');

    expect(resultado.registrosExitosos).toBe(1);
    expect(prisma.evidencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigoGuia: CodigoDocumentoGuia.G1,
        requiereChecklistMaestro: true,
        periodo: '2026-2',
      }),
    });
  });

  it('rechaza filas con guía inválida', async () => {
    const buffer = await excelConFilas([['Anexo', 'DER', '2026-2', 'Factor 1']]);

    const resultado = await servicio.parsearExcel(buffer, 'car');

    expect(resultado.registrosFallidos).toBe(1);
    expect(resultado.errores[0].motivo).toContain('codigoGuia');
    expect(prisma.evidencia.create).not.toHaveBeenCalled();
  });
});
