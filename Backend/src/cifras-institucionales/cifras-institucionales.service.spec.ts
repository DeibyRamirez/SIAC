import { BadRequestException, HttpException } from '@nestjs/common';
import { CifrasInstitucionalesService } from './cifras-institucionales.service';

const estudiante = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  semestre: 5,
  estrato: 2,
  valor_dimension: 1,
  codigo_estudiante: '2020002350129',
  periodo_academico: '2026-1',
  nombre_estudiante: 'Ana Pérez',
};

describe('reemplazo de ámbito de cifras', () => {
  const deleteMany = jest.fn();
  const createMany = jest.fn();
  const prisma = {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ cifraEstudiante: { deleteMany, createMany } }),
    ),
  };

  const servicio = new CifrasInstitucionalesService(prisma as never);

  beforeEach(() => {
    deleteMany.mockReset();
    createMany.mockReset();
    prisma.$transaction.mockClear();
  });

  it('borra y vuelve a insertar solo el periodo del lote, dentro de una transacción', async () => {
    const resultado = await servicio.enviar('estudiantes', { registros: [estudiante] }, 'int-1');
    expect(resultado).toEqual({ filasOk: 1, filasError: 0, errores: [] });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { periodoAcademico: '2026-1' } });
    const escritos = createMany.mock.calls[0][0].data as Array<Record<string, unknown>>;
    expect(escritos).toHaveLength(1);
    expect(escritos[0].integradorId).toBe('int-1');
    expect(escritos[0].nombreEstudiante).toBe('Ana Pérez');
    expect(escritos[0].enviadoEn).toBeInstanceOf(Date);
  });

  it('no escribe nada si hay un error de validación', async () => {
    await expect(
      servicio.enviar('estudiantes', { registros: [{ ...estudiante, genero: 'Otro' }] }, 'int-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    try {
      await servicio.enviar('estudiantes', { registros: [{ ...estudiante, genero: 'Otro' }] }, 'int-1');
    } catch (error) {
      const cuerpo = (error as BadRequestException).getResponse() as {
        filasOk: number;
        filasError: number;
        errores: Array<{ columna: string }>;
      };
      expect(cuerpo.filasOk).toBe(0);
      expect(cuerpo.filasError).toBe(1);
      expect(cuerpo.errores[0].columna).toBe('genero');
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('responde 413 cuando el lote supera 5000 registros', async () => {
    const registros = Array.from({ length: 5001 }, () => estudiante);
    await expect(servicio.enviar('estudiantes', { registros }, 'int-1')).rejects.toBeInstanceOf(HttpException);
    try {
      await servicio.enviar('estudiantes', { registros }, 'int-1');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(413);
      expect((error as HttpException).message).toContain('5000');
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
