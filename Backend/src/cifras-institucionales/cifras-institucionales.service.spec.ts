import { BadRequestException } from '@nestjs/common';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';

const ESTUDIANTE = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  semestre: 5,
  estrato: 2,
  codigo_estudiante: '2020002350129',
  periodo_academico: '2026-1',
};

const INFRAESTRUCTURA = {
  sede: 'Popayán',
  direccion: 'Calle 1',
  numero_pisos: 3,
  estado: 'Activa',
  total_m2_area_construida: 1200,
  total_m2_area_terreno: 3000,
  cantidad_salones_clase: 10,
  area_m2_salon_clase: 40,
  cantidad_salas_sistemas: 2,
  area_m2_salas_sistemas: 50,
  cantidad_laboratorios: 1,
  area_m2_laboratorios: 80,
  cantidad_auditorios: 1,
  area_m2_auditorios: 200,
  cantidad_salas_lectura: 1,
  area_m2_salas_lectura: 30,
  cantidad_zonas_deportivas: 1,
  area_m2_zonas_deportivas: 400,
  cantidad_cafeterias: 1,
  cantidad_zonas_estudio: 2,
  cantidad_zonas_recreativas: 1,
};

const CLAVE = { id: 'c1', nombre: 'FEAT', categorias: ['estudiantes'] };

function prismaConTx() {
  const tx = {
    cifraEstudiante: {
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cifraInfraestructura: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    envioCifras: {
      create: jest.fn().mockResolvedValue({ id: 'e1' }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (cliente: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

describe('CifrasInstitucionalesService', () => {
  it('un lote inválido responde 400 y no abre transacción', async () => {
    const { prisma } = prismaConTx();
    const servicio = new CifrasInstitucionalesService(prisma as never);
    await expect(
      servicio.registrarEnvio(
        'estudiantes',
        '2026-1',
        [{ ...ESTUDIANTE, semestre: 99 }],
        CLAVE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reemplaza el periodo: borra las filas previas y luego inserta', async () => {
    const { prisma, tx } = prismaConTx();
    const servicio = new CifrasInstitucionalesService(prisma as never);
    const resultado = await servicio.registrarEnvio('estudiantes', '2026-1', [ESTUDIANTE], CLAVE);
    expect(resultado).toEqual({ filasOk: 1, filasError: 0, errores: [], envioId: 'e1' });
    expect(tx.cifraEstudiante.deleteMany).toHaveBeenCalledWith({
      where: { periodoAcademico: '2026-1' },
    });
    expect(tx.envioCifras.create).toHaveBeenCalled();
    expect(tx.cifraEstudiante.createMany).toHaveBeenCalled();
  });

  it('infraestructura reemplaza por sede, no por periodo', async () => {
    const { prisma, tx } = prismaConTx();
    const servicio = new CifrasInstitucionalesService(prisma as never);
    await servicio.registrarEnvio('infraestructura', undefined, [INFRAESTRUCTURA], CLAVE);
    expect(tx.cifraInfraestructura.deleteMany).toHaveBeenCalledWith({
      where: { sede: { in: ['Popayán'] } },
    });
    expect(tx.cifraEstudiante.deleteMany).not.toHaveBeenCalled();
  });
});
