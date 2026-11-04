import { ClavesIntegracionService } from './claves-integracion.service';
import { hashearClaveIntegracion } from './secreto-clave-integracion';

describe('ClavesIntegracionService', () => {
  it('autenticar rechaza secreto vacío o clave inactiva', async () => {
    const prisma = {
      claveIntegracion: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const servicio = new ClavesIntegracionService(prisma as never);
    await expect(servicio.autenticar(undefined)).resolves.toBeNull();
    await expect(servicio.autenticar('siac_live_inexistente')).resolves.toBeNull();
  });

  it('autenticar acepta una clave activa y registra el último uso', async () => {
    const secreto = 'siac_live_prueba';
    const hash = hashearClaveIntegracion(secreto);
    const prisma = {
      claveIntegracion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          nombre: 'FEAT',
          categorias: ['estudiantes'],
          activa: true,
          hash,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const servicio = new ClavesIntegracionService(prisma as never);
    await expect(servicio.autenticar(secreto)).resolves.toEqual({
      id: 'c1',
      nombre: 'FEAT',
      categorias: ['estudiantes'],
    });
    expect(prisma.claveIntegracion.update).toHaveBeenCalled();
  });

  it('autenticar rechaza una clave inactiva aunque el hash coincida', async () => {
    const secreto = 'siac_live_prueba';
    const hash = hashearClaveIntegracion(secreto);
    const prisma = {
      claveIntegracion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          nombre: 'FEAT',
          categorias: ['estudiantes'],
          activa: false,
          hash,
        }),
        update: jest.fn(),
      },
    };
    const servicio = new ClavesIntegracionService(prisma as never);
    await expect(servicio.autenticar(secreto)).resolves.toBeNull();
    expect(prisma.claveIntegracion.update).not.toHaveBeenCalled();
  });
});
