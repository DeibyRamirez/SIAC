import { RolUsuario } from '@prisma/client';
import { NotificacionesAvanceService } from './notificaciones-avance.service';
import { NotificacionesDestinatariosService } from './notificaciones-destinatarios.service';

describe('NotificacionesAvanceService · destinatarios', () => {
  function crear() {
    const usuarioFindMany = jest.fn(async (args: { where: { rol: unknown } }) =>
      args.where.rol === RolUsuario.Revisor ? [{ id: 'rev-p1' }] : [{ id: 'admin' }, { id: 'super' }],
    );
    const prisma = {
      configuracionSIAC: {
        findUnique: jest.fn().mockResolvedValue({ avanceMinimoAmarillo: 55, avanceMinimoVerde: 100 }),
      },
      programa: { findUnique: jest.fn().mockResolvedValue({ nombre: 'Derecho' }) },
      usuario: { findMany: usuarioFindMany },
    };
    const despacho = { notificar: jest.fn().mockResolvedValue(undefined) };
    const servicio = new NotificacionesAvanceService(
      prisma as never,
      despacho as never,
      new NotificacionesDestinatariosService(prisma as never),
    );
    return { servicio, despacho, usuarioFindMany };
  }

  it('al cruzar el umbral amarillo avisa a Administrador, SuperAdmin y Revisor del programa', async () => {
    const { servicio, despacho, usuarioFindMany } = crear();

    await servicio.evaluarUmbralesPrograma('p1', 40, 60);

    expect(despacho.notificar.mock.calls.map((c) => c[0].usuarioId)).toEqual(['admin', 'super', 'rev-p1']);
    expect(despacho.notificar.mock.calls.every((c) => c[0].tipo === 'avance')).toBe(true);
    expect(usuarioFindMany).toHaveBeenCalledWith({
      where: { activo: true, rol: RolUsuario.Revisor, usuarioProgramas: { some: { programaId: 'p1' } } },
      select: { id: true },
    });
    const roles = JSON.stringify(usuarioFindMany.mock.calls.map((c) => c[0].where.rol));
    expect(roles).not.toMatch(/ParAcademico|Cargador/);
  });

  it('si cruza amarillo y verde a la vez crea un aviso por umbral y destinatario', async () => {
    const { servicio, despacho } = crear();

    await servicio.evaluarUmbralesPrograma('p1', 10, 100);

    expect(despacho.notificar).toHaveBeenCalledTimes(6);
    expect(new Set(despacho.notificar.mock.calls.map((c) => c[0].claveEvento)).size).toBe(6);
  });

  it('sin cruce de umbral no notifica a nadie', async () => {
    const { servicio, despacho } = crear();

    await servicio.evaluarUmbralesPrograma('p1', 60, 70);

    expect(despacho.notificar).not.toHaveBeenCalled();
  });
});
