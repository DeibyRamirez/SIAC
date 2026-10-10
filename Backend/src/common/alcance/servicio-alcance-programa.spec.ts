import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import { construirFiltroVisibilidad, rolPuedeDictaminar } from './servicio-alcance-programa';

describe('construirFiltroVisibilidad', () => {
  it('el superadmin no restringe el listado', () => {
    expect(
      construirFiltroVisibilidad({ id: 'sa', rol: RolUsuario.SuperAdmin }, []),
    ).toEqual({});
  });

  it('el par académico solo ve validados', () => {
    expect(
      construirFiltroVisibilidad({ id: 'par', rol: RolUsuario.ParAcademico }, []),
    ).toEqual({ estado: EstadoEvidencia.Validado });
  });

  it('el administrador no ve borradores nunca enviados', () => {
    expect(
      construirFiltroVisibilidad({ id: 'admin', rol: RolUsuario.Administrador }, []),
    ).toEqual({
      OR: [
        { estado: { not: EstadoEvidencia.Borrador } },
        { historial: { some: { estado: { not: EstadoEvidencia.Borrador } } } },
      ],
    });
  });

  it('el cargador ve sus programas asignados', () => {
    expect(
      construirFiltroVisibilidad({ id: 'car', rol: RolUsuario.Cargador }, ['prog-1'], false),
    ).toEqual({
      autorId: 'car',
      OR: [{ programaId: { in: ['prog-1'] } }],
    });
  });

  it('el cargador responsable institucional ve además G3/G4 propias', () => {
    expect(
      construirFiltroVisibilidad({ id: 'car', rol: RolUsuario.Cargador }, ['prog-1'], true),
    ).toEqual({
      autorId: 'car',
      OR: [{ programaId: { in: ['prog-1'] } }, { institucionId: { not: null } }],
    });
  });

  it('el cargador solo institucional sin programas', () => {
    expect(
      construirFiltroVisibilidad({ id: 'car', rol: RolUsuario.Cargador }, [], true),
    ).toEqual({
      autorId: 'car',
      OR: [{ institucionId: { not: null } }],
    });
  });

  it('el cargador sin programas ni asignación institucional no ve nada', () => {
    expect(
      construirFiltroVisibilidad({ id: 'car', rol: RolUsuario.Cargador }, [], false),
    ).toEqual({ id: { in: [] } });
  });

  it('el revisor ve documentos no borrador de sus programas', () => {
    expect(
      construirFiltroVisibilidad({ id: 'rev', rol: RolUsuario.Revisor }, ['prog-2'], false),
    ).toEqual({
      estado: { not: EstadoEvidencia.Borrador },
      OR: [{ programaId: { in: ['prog-2'] } }],
    });
  });

  it('el revisor responsable institucional ve también evidencias G3/G4', () => {
    expect(
      construirFiltroVisibilidad({ id: 'rev', rol: RolUsuario.Revisor }, ['prog-2'], true),
    ).toEqual({
      estado: { not: EstadoEvidencia.Borrador },
      OR: [{ programaId: { in: ['prog-2'] } }, { institucionId: { not: null } }],
    });
  });
});

describe('rolPuedeDictaminar', () => {
  it('solo el revisor y el superadmin dictaminan', () => {
    expect(rolPuedeDictaminar(RolUsuario.Revisor)).toBe(true);
    expect(rolPuedeDictaminar(RolUsuario.SuperAdmin)).toBe(true);
    expect(rolPuedeDictaminar(RolUsuario.Administrador)).toBe(false);
    expect(rolPuedeDictaminar(RolUsuario.Cargador)).toBe(false);
  });
});
