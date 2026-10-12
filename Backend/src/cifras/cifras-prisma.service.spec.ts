import { NotFoundException } from '@nestjs/common';
import { FuenteCifra, VariableCifra, Prisma } from '@prisma/client';
import { CifrasPrismaService } from './cifras-prisma.service';
import { CifrasRepositorio, CifraConVariable } from './cifras.repositorio';
import { CifrasSemillaService } from './cifras-semilla.service';

const VARIABLE_VINCULACION: VariableCifra = {
  id: 'var-vinculacion',
  categoriaId: 'profesores',
  clave: 'por_vinculacion',
  etiquetaCuac: 'Profesores por vinculación',
  descripcion: null,
  unidad: 'conteo',
  dimensiones: ['vinculacion'],
  activo: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const VARIABLE_DEDICACION: VariableCifra = {
  ...VARIABLE_VINCULACION,
  id: 'var-dedicacion',
  clave: 'por_dedicacion',
  etiquetaCuac: 'Profesores por dedicación',
  dimensiones: ['dedicacion'],
};

function fila(
  variable: VariableCifra,
  fuente: FuenteCifra,
  valor: number,
  actualizadoEn = new Date('2026-10-12T10:00:00Z'),
): CifraConVariable {
  return {
    id: `cifra-${variable.clave}-${fuente}-${valor}`,
    categoriaId: variable.categoriaId,
    variableId: variable.id,
    periodo: '2025-2',
    facultad: null,
    programaId: null,
    sede: null,
    dimension: variable.dimensiones[0] ?? null,
    valorDimension: 'TC',
    valor: new Prisma.Decimal(valor),
    fuente,
    cargaId: null,
    createdAt: actualizadoEn,
    updatedAt: actualizadoEn,
    variable,
  } as unknown as CifraConVariable;
}

class RepositorioFalso {
  periodos: string[] = ['2025-2'];
  filas: CifraConVariable[] = [];

  async listarVariables(): Promise<VariableCifra[]> {
    return [VARIABLE_VINCULACION, VARIABLE_DEDICACION];
  }

  async listarPeriodos(): Promise<string[]> {
    return this.periodos;
  }

  async consultarIndicadores(): Promise<CifraConVariable[]> {
    return this.filas;
  }
}

function crearServicio(
  repositorio: RepositorioFalso,
  semilla: Partial<CifrasSemillaService> = {},
): CifrasPrismaService {
  return new CifrasPrismaService(
    repositorio as unknown as CifrasRepositorio,
    {
      tieneDatos: () => false,
      obtenerPorCategoria: async () => {
        throw new NotFoundException('sin semilla');
      },
      ...semilla,
    } as unknown as CifrasSemillaService,
  );
}

describe('CifrasPrismaService — fuente por indicador y MIXTA', () => {
  it('con una sola fuente, meta e indicadores la reportan', async () => {
    const repositorio = new RepositorioFalso();
    repositorio.filas = [fila(VARIABLE_VINCULACION, FuenteCifra.EXCEL, 130)];
    const servicio = crearServicio(repositorio);

    const respuesta = await servicio.obtenerPorCategoria('profesores', '2025-2');

    expect(respuesta.meta.fuente).toBe('EXCEL');
    expect(respuesta.indicadores).toHaveLength(1);
    expect(respuesta.indicadores[0].fuente).toBe('EXCEL');
  });

  it('con indicadores de varias fuentes en el periodo, meta es MIXTA y cada indicador conserva la suya', async () => {
    const repositorio = new RepositorioFalso();
    repositorio.filas = [
      fila(VARIABLE_VINCULACION, FuenteCifra.EXCEL, 130),
      fila(VARIABLE_DEDICACION, FuenteCifra.API, 70),
    ];
    const servicio = crearServicio(repositorio);

    const respuesta = await servicio.obtenerPorCategoria('profesores', '2025-2');

    expect(respuesta.meta.fuente).toBe('MIXTA');
    const porClave = new Map(respuesta.indicadores.map((i) => [i.clave, i.fuente]));
    expect(porClave.get('por_vinculacion')).toBe('EXCEL');
    expect(porClave.get('por_dedicacion')).toBe('API');
  });

  it('si una misma variable mezcla fuentes, su indicador es MIXTA', async () => {
    const repositorio = new RepositorioFalso();
    repositorio.filas = [
      fila(VARIABLE_VINCULACION, FuenteCifra.EXCEL, 100),
      fila(VARIABLE_VINCULACION, FuenteCifra.API, 30),
    ];
    const servicio = crearServicio(repositorio);

    const respuesta = await servicio.obtenerPorCategoria('profesores', '2025-2');

    expect(respuesta.meta.fuente).toBe('MIXTA');
    expect(respuesta.indicadores[0].fuente).toBe('MIXTA');
    expect(respuesta.indicadores[0].total).toBe(130);
  });

  it('sin datos en BD usa la semilla y marca SEMILLA en meta e indicadores', async () => {
    const repositorio = new RepositorioFalso();
    repositorio.periodos = [];
    const servicio = crearServicio(repositorio, {
      obtenerPorCategoria: async () =>
        ({
          meta: {
            categoriaId: 'estudiantes',
            titulo: 'Estudiantes',
            periodo: '2025-1',
            actualizadoEn: '2025-09-30T12:00:00.000Z',
            fuente: 'Semilla',
          },
          indicadores: [
            {
              id: 'total_matriculados',
              etiqueta: 'Total matriculados',
              valor: 8420,
              unidad: 'personas',
              formato: 'entero',
            },
          ],
          series: [],
          filtrosDisponibles: { periodos: ['2024-2', '2025-1'] },
        }) as never,
    });

    const respuesta = await servicio.obtenerPorCategoria('estudiantes');

    expect(respuesta.meta.fuente).toBe('SEMILLA');
    expect(respuesta.indicadores[0].fuente).toBe('SEMILLA');
    expect(respuesta.indicadores[0].clave).toBe('total_matriculados');
    expect(respuesta.indicadores[0].total).toBe(8420);
    expect(respuesta.periodosDisponibles).toEqual(['2024-2', '2025-1']);
  });
});
