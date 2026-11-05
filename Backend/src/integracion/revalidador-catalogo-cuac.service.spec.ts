import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { RevalidadorCatalogoCuacService } from './revalidador-catalogo-cuac.service';
import { CatalogoCuacPersistenciaService } from './catalogo-cuac-persistencia.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';

describe('RevalidadorCatalogoCuacService · resiliencia pool P2024', () => {
  function crearServicio(persistencia: Partial<CatalogoCuacPersistenciaService>) {
    const config = {
      get: (clave: string) => (clave === 'CARRERAS_SYNC_HABILITADO' ? 'true' : undefined),
    } as ConfigService;
    return new RevalidadorCatalogoCuacService(
      config,
      {} as ClienteCarrerasCuacService,
      persistencia as CatalogoCuacPersistenciaService,
    );
  }

  it('no propaga P2024 al comprobar obsolescencia (estaObsoleto)', async () => {
    const p2024 = new Prisma.PrismaClientKnownRequestError('Timed out fetching a new connection', {
      code: 'P2024',
      clientVersion: 'test',
    });
    const persistencia = {
      estaObsoleto: jest.fn().mockRejectedValue(p2024),
    };
    const servicio = crearServicio(persistencia);

    await expect(servicio.revalidarSiObsoleto()).resolves.toBeUndefined();
    expect(persistencia.estaObsoleto).toHaveBeenCalled();
  });

  it('solo permite un vuelo de revalidación concurrente', async () => {
    let desbloquear!: () => void;
    const bloqueo = new Promise<void>((resolve) => {
      desbloquear = resolve;
    });

    const persistencia = {
      estaObsoleto: jest.fn().mockResolvedValue(true),
      aplicarRespuestaApi: jest.fn().mockResolvedValue({ importados: 0, actualizados: 0 }),
    };
    const cliente = {
      fetchCatalogoRemoto: jest.fn().mockImplementation(async () => {
        await bloqueo;
        return { success: true, carreras: [] };
      }),
    };
    const config = {
      get: (clave: string) => (clave === 'CARRERAS_SYNC_HABILITADO' ? 'true' : undefined),
    } as ConfigService;
    const servicio = new RevalidadorCatalogoCuacService(
      config,
      cliente as unknown as ClienteCarrerasCuacService,
      persistencia as unknown as CatalogoCuacPersistenciaService,
    );

    const primera = servicio.revalidarSiObsoleto(true);
    const segunda = servicio.revalidarSiObsoleto(true);
    desbloquear();
    await Promise.all([primera, segunda]);

    expect(cliente.fetchCatalogoRemoto).toHaveBeenCalledTimes(1);
  });
});
