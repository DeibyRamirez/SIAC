import { EstadoEvidencia } from '@prisma/client';
import { ProgramaRepositorio } from './programas.service';

/** Los conteos y métricas agregadas no revelan borradores (son privados de su autor). */
describe('ProgramaRepositorio · conteos sin borradores', () => {
  const prisma = {
    evidencia: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const repo = new ProgramaRepositorio(prisma as never);

  it('agruparEvidenciasPorEstado excluye Borrador', async () => {
    await repo.agruparEvidenciasPorEstado(['p1']);
    expect(prisma.evidencia.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { programaId: { in: ['p1'] }, estado: { not: EstadoEvidencia.Borrador } },
      }),
    );
  });

  it('listarEstadosEvidencia excluye Borrador', async () => {
    await repo.listarEstadosEvidencia('p1');
    expect(prisma.evidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { programaId: 'p1', estado: { not: EstadoEvidencia.Borrador } } }),
    );
  });
});
