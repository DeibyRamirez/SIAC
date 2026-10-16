import { Logger } from '@nestjs/common';
import { ConfiguracionSiacService } from './configuracion-siac.service';

const FILA_GLOBAL = {
  id: 'global',
  avanceMinimoVerde: 100,
  avanceMinimoAmarillo: 55,
  aniosVigencia: 7,
  mesesAvisoVigencia: 24,
  mesesRojoVigencia: 18,
};

describe('ConfiguracionSiacService (T-007.3a)', () => {
  let prisma: {
    configuracionSIAC: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let servicio: ConfiguracionSiacService;

  beforeEach(() => {
    prisma = {
      configuracionSIAC: {
        findUnique: jest.fn().mockResolvedValue(FILA_GLOBAL),
        upsert: jest.fn().mockResolvedValue(FILA_GLOBAL),
      },
    };
    servicio = new ConfiguracionSiacService(prisma as never);
  });

  it('carga los umbrales de la fila global (100/55, 7 años, 24/18)', async () => {
    const umbrales = await servicio.cargar();
    expect(umbrales).toMatchObject({
      minimoVerde: 100,
      minimoAmarillo: 55,
      aniosVigencia: 7,
      mesesAvisoVigencia: 24,
      mesesRojoVigencia: 18,
    });
  });

  it('relee la BD en cada cargar() (cambio de mesesRojoVigencia sin redeploy)', async () => {
    await servicio.cargar();
    prisma.configuracionSIAC.findUnique.mockResolvedValue({
      ...FILA_GLOBAL,
      mesesRojoVigencia: 6,
    });
    const umbrales = await servicio.cargar();
    expect(umbrales.mesesRojoVigencia).toBe(6);
  });

  it('si la fila es incoherente (aviso ≤ rojo) cargar() lanza y el backend no arranca', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue({
      ...FILA_GLOBAL,
      mesesAvisoVigencia: 6,
      mesesRojoVigencia: 18,
    });
    await expect(servicio.cargar()).rejects.toThrow(/mesesAvisoVigencia/);
  });

  it('actualizarUmbrales valida y persiste solo los campos de vigencia', async () => {
    const resultado = await servicio.actualizarUmbrales({
      mesesAvisoVigencia: 30,
      mesesRojoVigencia: 6,
    });
    expect(resultado.mesesAvisoVigencia).toBe(30);
    expect(resultado.mesesRojoVigencia).toBe(6);
    expect(prisma.configuracionSIAC.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'global' },
        update: { mesesAvisoVigencia: 30, mesesRojoVigencia: 6 },
      }),
    );
  });

  it('actualizarUmbrales rechaza mesesAvisoVigencia ≤ mesesRojoVigencia', async () => {
    await expect(
      servicio.actualizarUmbrales({ mesesAvisoVigencia: 6, mesesRojoVigencia: 18 }),
    ).rejects.toThrow(/mesesAvisoVigencia/);
    expect(prisma.configuracionSIAC.upsert).not.toHaveBeenCalled();
  });

  it('actualizarUmbrales deja en el log el usuario y los valores anterior/nuevo', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    await servicio.actualizarUmbrales({ mesesAvisoVigencia: 30, mesesRojoVigencia: 6 }, 'usuario-admin-1');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('usuario-admin-1'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('mesesAvisoVigencia 24 → 30'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('mesesRojoVigencia 18 → 6'));
    log.mockRestore();
  });

  it('mesesRojoVigencia = 0 en BD es incoherente (el rojo debe ser ≥ 1 mes)', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue({ ...FILA_GLOBAL, mesesRojoVigencia: 0 });
    await expect(servicio.cargar()).rejects.toThrow(/mesesRojoVigencia debe ser un entero ≥ 1/);
  });
});
