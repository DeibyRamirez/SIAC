import { OrigenDato } from '@prisma/client';
import { CatalogoCuacPersistenciaService } from './catalogo-cuac-persistencia.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';

describe('CatalogoCuacPersistenciaService · upsert por lotes', () => {
  it('precarga programas con un solo findMany (sin N× findUnique)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const findUnique = jest.fn();
    const transaction = jest.fn().mockResolvedValue([]);
    const create = jest.fn((args: unknown) => ({ kind: 'create', args }));
    const update = jest.fn((args: unknown) => ({ kind: 'update', args }));
    const count = jest.fn().mockResolvedValue(0);
    const institucionFind = jest.fn().mockResolvedValue({ id: 'inst-1' });
    const institucionUpdate = jest.fn().mockResolvedValue({});

    const prisma = {
      programa: { findMany, findUnique, create, update, count, updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      institucion: { findFirst: institucionFind, update: institucionUpdate },
      $transaction: transaction,
    };

    const cliente = { baseImagenes: () => 'https://ejemplo.test' } as unknown as ClienteCarrerasCuacService;
    const servicio = new CatalogoCuacPersistenciaService(prisma as never, cliente);

    const carreras = Array.from({ length: 30 }, (_, i) => ({
      _id: `ext-${i}`,
      titulo: `Programa ${i}`,
      codigoCu: `CU${i}`,
      codigoSnies: `${1000 + i}`,
      nivel: 'Profesional',
      modalidad: 'Presencial',
      facultad: 'Facultad',
      duracion: '10 semestres',
      creditos: 160,
      activo: true,
    }));

    const inicio = Date.now();
    await servicio.aplicarRespuestaApi({ success: true, version: '2026-2', carreras });
    const duracionMs = Date.now() - inicio;

    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalled();
    expect(duracionMs).toBeLessThan(5_000);
  });
});
