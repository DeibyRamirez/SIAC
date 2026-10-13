import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CifrasFeedService } from './cifras-feed.service';
import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';

class RegistrosFalso {
  filas: Array<Record<string, unknown>> = [];

  esCategoriaRegistros(categoriaId: string): boolean {
    return !['bienestar', 'relaciones-entorno'].includes(categoriaId);
  }

  async contar(): Promise<number> {
    return this.filas.length;
  }

  async consultar(
    _categoriaId: string,
    _filtros: unknown,
    paginacion?: { skip: number; take: number },
  ): Promise<Array<Record<string, unknown>>> {
    if (!paginacion) return this.filas;
    return this.filas.slice(paginacion.skip, paginacion.skip + paginacion.take);
  }
}

function crearServicio(registros: RegistrosFalso, prisma?: object): CifrasFeedService {
  return new CifrasFeedService(
    registros as unknown as CifrasRegistrosRepositorio,
    (prisma ?? {}) as PrismaService,
  );
}

describe('CifrasFeedService (S3-03)', () => {
  it('pagina y limita el tamaño a 5000 sin exponer nombres', async () => {
    const registros = new RegistrosFalso();
    registros.filas = Array.from({ length: 25 }, (_, indice) => ({
      programa: `Programa ${indice}`,
      genero: 'Femenino',
      facultad: 'Facultad X',
      semestre: 1,
      estrato: 1,
      codigo_estudiante: `00${indice}`,
      periodo_academico: '2023-2',
      fecha: new Date('2023-08-01T00:00:00.000Z'),
      area: new Prisma.Decimal('12.50'),
    }));
    const servicio = crearServicio(registros);

    const respuesta = await servicio.obtenerDatos('estudiantes', {
      pagina: 2,
      tamano: 10,
    });

    expect(respuesta.totalRegistros).toBe(25);
    expect(respuesta.pagina).toBe(2);
    expect(respuesta.tamano).toBe(10);
    expect(respuesta.registros).toHaveLength(10);
    expect(respuesta.registros[0].fecha).toBe('2023-08-01T00:00:00.000Z');
    expect(respuesta.registros[0].area).toBe(12.5);
    expect(JSON.stringify(respuesta)).not.toMatch(/nombre/i);

    const limitado = await servicio.obtenerDatos('estudiantes', { tamano: 9000 });
    expect(limitado.tamano).toBe(5000);
  });

  it('en categorías clave/valor entrega filas planas con la variable', async () => {
    const prismaFalso = {
      cifraIndicador: {
        count: async () => 1,
        findMany: async () => [
          {
            id: 'c-1',
            variable: {
              clave: 'convenios_activos',
              etiquetaCuac: 'Convenios activos',
              unidad: 'conteo',
            },
            periodo: '2023-2',
            facultad: 'Facultad X',
            sede: null,
            dimension: 'tipo',
            valorDimension: 'Empresa',
            valor: new Prisma.Decimal('7.00'),
            fuente: 'EXCEL',
          },
        ],
      },
    };
    const servicio = crearServicio(new RegistrosFalso(), prismaFalso);

    const respuesta = await servicio.obtenerDatos('relaciones-entorno', {
      periodo: '2023-2',
    });

    expect(respuesta.totalRegistros).toBe(1);
    expect(respuesta.registros[0]).toMatchObject({
      clave: 'convenios_activos',
      valor: 7,
      dimension: 'tipo',
      valor_dimension: 'Empresa',
    });
  });
});
