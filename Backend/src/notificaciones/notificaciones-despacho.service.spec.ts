import { NotificacionesDespachoService } from './notificaciones-despacho.service';

describe('NotificacionesDespachoService', () => {
  const notificaciones = { crear: jest.fn().mockResolvedValue({}) };
  const usuarios = {
    buscarPorId: jest.fn(),
    buscarPorCorreo: jest.fn(),
  };
  const correo = { enviar: jest.fn().mockResolvedValue(undefined) };

  let servicio: NotificacionesDespachoService;

  beforeEach(() => {
    jest.clearAllMocks();
    servicio = new NotificacionesDespachoService(
      notificaciones as never,
      usuarios as never,
      correo as never,
    );
  });

  it('crea alerta in-app y envía correo al usuario', async () => {
    usuarios.buscarPorId.mockResolvedValue({
      id: 'u1',
      correo: 'maria@uniautonoma.edu.co',
    });

    await servicio.notificar({
      usuarioId: 'u1',
      mensaje: 'Hola',
      tipo: 'general',
      asuntoCorreo: '[SIAC] Prueba',
    });

    expect(notificaciones.crear).toHaveBeenCalledWith('u1', 'Hola', 'general', undefined);
    expect(correo.enviar).toHaveBeenCalledWith({
      destinatario: 'maria@uniautonoma.edu.co',
      asunto: '[SIAC] Prueba',
      textoPlano: 'Hola',
    });
  });

  it('no lanza si el correo falla', async () => {
    usuarios.buscarPorId.mockResolvedValue({
      id: 'u1',
      correo: 'maria@uniautonoma.edu.co',
    });
    correo.enviar.mockRejectedValue(new Error('SMTP caído'));

    await expect(
      servicio.notificar({ usuarioId: 'u1', mensaje: 'Hola', tipo: 'general' }),
    ).resolves.toBeUndefined();
  });
});
