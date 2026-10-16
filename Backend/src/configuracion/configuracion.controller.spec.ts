import { RolUsuario } from '@prisma/client';

import { ROLES_KEY } from '../common/guards/roles.guard';
import { ConfiguracionController } from './configuracion.controller';
import type { UmbralesSemaforo } from '../dominio/panel-siac';

const UMBRALES: UmbralesSemaforo = {
  minimoVerde: 100,
  minimoAmarillo: 55,
  aniosVigencia: 7,
  mesesAvisoVigencia: 24,
  mesesRojoVigencia: 18,
};

/** T-007.3a: el controlador delega en el servicio y restringe a SuperAdmin/Administrador. */
describe('ConfiguracionController', () => {
  let servicio: { cargar: jest.Mock; actualizarUmbrales: jest.Mock };
  let controlador: ConfiguracionController;

  beforeEach(() => {
    servicio = {
      cargar: jest.fn().mockResolvedValue(UMBRALES),
      actualizarUmbrales: jest.fn().mockResolvedValue({
        ...UMBRALES,
        mesesAvisoVigencia: 30,
        mesesRojoVigencia: 6,
      }),
    };
    controlador = new ConfiguracionController(servicio as never);
  });

  it('GET /configuracion/vigencia relee la BD y responde solo el subconjunto de vigencia', async () => {
    const respuesta = await controlador.obtenerVigencia();

    expect(servicio.cargar).toHaveBeenCalledTimes(1);
    expect(respuesta).toEqual({
      aniosVigencia: 7,
      mesesAvisoVigencia: 24,
      mesesRojoVigencia: 18,
    });
  });

  it('PATCH /configuracion/vigencia delega el DTO y devuelve los umbrales guardados', async () => {
    const respuesta = await controlador.actualizarVigencia(
      { mesesAvisoVigencia: 30, mesesRojoVigencia: 6 },
      { user: { id: 'usuario-admin-1' } },
    );

    expect(servicio.actualizarUmbrales).toHaveBeenCalledWith(
      { mesesAvisoVigencia: 30, mesesRojoVigencia: 6 },
      'usuario-admin-1',
    );
    expect(respuesta).toEqual({
      aniosVigencia: 7,
      mesesAvisoVigencia: 30,
      mesesRojoVigencia: 6,
    });
  });

  it.each([
    ['obtenerVigencia', ConfiguracionController.prototype.obtenerVigencia],
    ['actualizarVigencia', ConfiguracionController.prototype.actualizarVigencia],
  ])('%s exige SuperAdmin y Administrador', (_nombre, metodo) => {
    const roles = Reflect.getMetadata(ROLES_KEY, metodo) as RolUsuario[];
    expect(roles).toEqual(
      expect.arrayContaining([RolUsuario.SuperAdmin, RolUsuario.Administrador]),
    );
  });
});
