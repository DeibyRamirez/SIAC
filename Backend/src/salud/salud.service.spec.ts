import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { SaludController } from './salud.controller';
import { SaludService } from './salud.service';

function crearServicio(queryRaw: jest.Mock): SaludService {
  return new SaludService({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe('SaludService / SaludController (GET /api/v1/salud)', () => {
  it('responde ok cuando la BD contesta el ping', async () => {
    const servicio = crearServicio(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    const estado = await new SaludController(servicio).consultar();
    expect(estado.estado).toBe('ok');
    expect(estado.baseDatos).toBe('ok');
    expect(typeof estado.latenciaBdMs).toBe('number');
  });

  it('marca degradado si la BD falla', async () => {
    const servicio = crearServicio(jest.fn().mockRejectedValue(new Error('P1001')));
    const estado = await servicio.consultar();
    expect(estado).toMatchObject({ estado: 'degradado', baseDatos: 'sin_conexion', latenciaBdMs: null });
  });

  it('marca degradado si el ping supera el límite de tiempo', async () => {
    const servicio = crearServicio(jest.fn().mockReturnValue(new Promise(() => undefined)));
    const estado = await servicio.consultar(20);
    expect(estado.baseDatos).toBe('sin_conexion');
  });

  it('el controlador responde 503 cuando la BD no está disponible', async () => {
    const servicio = crearServicio(jest.fn().mockRejectedValue(new Error('sin red')));
    await expect(new SaludController(servicio).consultar()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
