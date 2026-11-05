import { ConfigService } from '@nestjs/config';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';

describe('ClienteCarrerasCuacService', () => {
  const config = {
    get: jest.fn((clave: string) => {
      if (clave === 'CARRERAS_API_URL') return 'https://api-programas-cuac.vercel.app/carreras';
      if (clave === 'CARRERAS_IMAGENES_BASE_URL') return 'https://sitio-cuac.vercel.app';
      return undefined;
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devuelve catálogo desde caché en el segundo llamado', async () => {
    const servicio = new ClienteCarrerasCuacService(config);
    const fetchMock = jest.spyOn(servicio, 'fetchCatalogoRemoto').mockResolvedValue({
      success: true,
      carreras: [{ _id: '1', titulo: 'Derecho', activo: true }],
    });

    const primero = await servicio.obtenerCatalogo();
    const segundo = await servicio.obtenerCatalogo();

    expect(primero.desdeCache).toBe(false);
    expect(segundo.desdeCache).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('degrada a caché previa si la API falla', async () => {
    const servicio = new ClienteCarrerasCuacService(config);
    jest
      .spyOn(servicio, 'fetchCatalogoRemoto')
      .mockResolvedValueOnce({
        success: true,
        carreras: [{ _id: '1', titulo: 'Derecho', activo: true }],
      })
      .mockRejectedValueOnce(new Error('timeout'));

    await servicio.obtenerCatalogo();
    const degradado = await servicio.obtenerCatalogo({ forzarRed: true });

    expect(degradado.degradado).toBe(true);
    expect(degradado.respuesta?.carreras).toHaveLength(1);
  });

  it('devuelve null si la API falla y no hay caché', async () => {
    const servicio = new ClienteCarrerasCuacService(config);
    jest.spyOn(servicio, 'fetchCatalogoRemoto').mockRejectedValue(new Error('caída'));

    const resultado = await servicio.obtenerCatalogo();

    expect(resultado.degradado).toBe(true);
    expect(resultado.respuesta).toBeNull();
  });
});
