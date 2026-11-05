import { RolUsuario } from '@prisma/client';
import { VigenciasService } from './vigencias.service';

/**
 * Aviso D-1 de anexos (PO 27/10): Administrador/SuperAdmin activos + Revisores activos del
 * programa del anexo, una vez por destinatario. El responsable del anexo no recibe aviso propio.
 */
describe('VigenciasService · destinatarios del aviso D-1 de anexos', () => {
  const anexo = {
    id: 'anx-1',
    titulo: 'Convenio de prácticas',
    fechaVencimiento: new Date('2026-10-17T00:00:00.000Z'),
    responsable: 'cargador@cuac.edu.co',
    programaId: 'p1',
    programa: { id: 'p1', nombre: 'Derecho' },
  };

  function crear(opciones: { responsableId: string | null; revisores: string[] }) {
    const usuarioFindMany = jest.fn(async (args: { where: { rol: unknown } }) =>
      args.where.rol === RolUsuario.Revisor
        ? opciones.revisores.map((id) => ({ id }))
        : [{ id: 'admin' }, { id: 'super' }],
    );
    const prisma = {
      anexoVigencia: { findMany: jest.fn().mockResolvedValue([anexo]) },
      usuario: {
        findMany: usuarioFindMany,
        findUnique: jest
          .fn()
          .mockResolvedValue(opciones.responsableId ? { id: opciones.responsableId } : null),
      },
    };
    const despacho = { notificar: jest.fn().mockResolvedValue(undefined), encolarCorreoExterno: jest.fn() };
    const servicio = new VigenciasService(prisma as never, despacho as never, {} as never, {} as never);
    const ejecutar = () =>
      (servicio as unknown as { notificarAnexosQueVencenManana(): Promise<void> }).notificarAnexosQueVencenManana();
    return { despacho, ejecutar, usuarioFindMany };
  }

  it('avisa a Administrador, SuperAdmin y al Revisor del programa; nunca al responsable', async () => {
    const { despacho, ejecutar, usuarioFindMany } = crear({ responsableId: 'cargador', revisores: ['rev-p1'] });

    await ejecutar();

    const destinos = despacho.notificar.mock.calls.map((c) => c[0].usuarioId);
    expect(destinos).toEqual(['admin', 'super', 'rev-p1']);
    expect(destinos).not.toContain('cargador');
    expect(new Set(despacho.notificar.mock.calls.map((c) => c[0].claveEvento)).size).toBe(3);
    expect(despacho.notificar.mock.calls.every((c) => c[0].tipo === 'anexo_vence_manana')).toBe(true);
    // Los Revisores se filtran por el programa del anexo.
    expect(usuarioFindMany).toHaveBeenCalledWith({
      where: { activo: true, rol: RolUsuario.Revisor, usuarioProgramas: { some: { programaId: 'p1' } } },
      select: { id: true },
    });
  });

  it('responsable sin cuenta: no se encola correo externo', async () => {
    const { despacho, ejecutar } = crear({ responsableId: null, revisores: [] });

    await ejecutar();

    expect(despacho.encolarCorreoExterno).not.toHaveBeenCalled();
    expect(despacho.notificar.mock.calls.map((c) => c[0].usuarioId)).toEqual(['admin', 'super']);
  });
});
