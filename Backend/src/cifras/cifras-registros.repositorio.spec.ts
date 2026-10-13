import { CifrasRegistrosRepositorio } from './cifras-registros.repositorio';
import { PrismaService } from '../prisma/prisma.module';

describe('CifrasRegistrosRepositorio — privacidad de datos personales', () => {
  const filaEstudiante = {
    id: 'r-1',
    nombreEstudiante: 'Ana María Pérez',
    programa: 'Ingeniería Agropecuaria',
    genero: 'Femenino',
    facultad: 'Facultad de Ciencias Agrarias',
    semestre: 5,
    estrato: 2,
    codigoEstudiante: '2020002350129',
    periodoAcademico: '2023-2',
    cargaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaFalso = {
    registroEstudiante: {
      findMany: async () => [filaEstudiante],
      count: async () => 1,
      deleteMany: async () => ({ count: 1 }),
      createMany: async () => ({ count: 1 }),
    },
  };

  it('consultar no expone el nombre del estudiante ni columnas personales', async () => {
    const repositorio = new CifrasRegistrosRepositorio(
      prismaFalso as unknown as PrismaService,
    );

    const filas = await repositorio.consultar('estudiantes', { periodo: '2023-2' });

    expect(filas).toHaveLength(1);
    expect(Object.keys(filas[0]).sort()).toEqual(
      [
        'codigo_estudiante',
        'estrato',
        'facultad',
        'genero',
        'periodo_academico',
        'programa',
        'semestre',
      ].sort(),
    );
    expect(JSON.stringify(filas)).not.toContain('Ana María Pérez');
    expect(filas[0].codigo_estudiante).toBe('2020002350129');
  });

  it('reemplazar borra por periodo e inserta por lotes con cargaId', async () => {
    const borrados: unknown[] = [];
    const insertados: Array<Record<string, unknown>> = [];
    const tx = {
      registroEstudiante: {
        deleteMany: async (argumentos: unknown) => {
          borrados.push(argumentos);
          return { count: 0 };
        },
        createMany: async (argumentos: { data: Array<Record<string, unknown>> }) => {
          insertados.push(...argumentos.data);
          return { count: argumentos.data.length };
        },
      },
    };
    const repositorio = new CifrasRegistrosRepositorio(
      prismaFalso as unknown as PrismaService,
    );

    const total = await repositorio.reemplazar(
      'estudiantes',
      ['2023-2'],
      [
        {
          programa: 'Ingeniería Agropecuaria',
          genero: 'Femenino',
          facultad: 'Facultad de Ciencias Agrarias',
          semestre: 5,
          estrato: 2,
          codigo_estudiante: '001',
          periodo_academico: '2023-2',
        },
      ],
      'carga-1',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx as any,
    );

    expect(total).toBe(1);
    expect(borrados[0]).toMatchObject({
      where: { periodoAcademico: { in: ['2023-2'] } },
    });
    expect(insertados[0]).toMatchObject({
      programa: 'Ingeniería Agropecuaria',
      periodoAcademico: '2023-2',
      cargaId: 'carga-1',
    });
  });
});
