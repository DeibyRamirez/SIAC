import * as ExcelJS from 'exceljs';
import { CodigoDocumentoGuia, RolUsuario } from '@prisma/client';
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
    const buffer = await excelConFilas([['Maestro Derecho', 'DER', '2099-2', 'g1']]);

    const resultado = await servicio.parsearExcel(buffer, 'car', RolUsuario.Cargador);

    expect(resultado.registrosExitosos).toBe(1);
    expect(prisma.evidencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigoGuia: CodigoDocumentoGuia.G1,
        requiereChecklistMaestro: true,
        periodo: '2099-2',
      }),
    });
  });

  it('rechaza filas con guía inválida', async () => {
    const buffer = await excelConFilas([['Anexo', 'DER', '2099-2', 'Factor 1']]);

    const resultado = await servicio.parsearExcel(buffer, 'car', RolUsuario.Cargador);

    expect(resultado.registrosFallidos).toBe(1);
    expect(resultado.errores[0].motivo).toContain('codigoGuia');
    expect(prisma.evidencia.create).not.toHaveBeenCalled();
  });

  it('rechaza un periodo que no es AAAA-1 o AAAA-2', async () => {
    const buffer = await excelConFilas([['Anexo', 'DER', '2026-3', 'G1']]);

    const resultado = await servicio.parsearExcel(buffer, 'car', RolUsuario.Cargador);

    expect(resultado.registrosFallidos).toBe(1);
    expect(resultado.errores[0].motivo).toMatch(/AAAA-1 o AAAA-2/);
    expect(resultado.errores[0].motivo).toContain('2026-3');
    expect(prisma.evidencia.create).not.toHaveBeenCalled();
  });

  it('el Cargador no carga un periodo cerrado; el Administrador sí', async () => {
    const pasado = await excelConFilas([['Histórica', 'DER', '2020-1', 'G2']]);

    const rechazada = await servicio.parsearExcel(pasado, 'car', RolUsuario.Cargador);
    expect(rechazada.registrosExitosos).toBe(0);
    expect(rechazada.errores[0].motivo).toMatch(/ya cerró/);
    expect(prisma.evidencia.create).not.toHaveBeenCalled();

    const aceptada = await servicio.parsearExcel(pasado, 'admin', RolUsuario.Administrador);
    expect(aceptada.registrosExitosos).toBe(1);
    expect(prisma.evidencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ periodo: '2020-1' }),
    });
  });
});
