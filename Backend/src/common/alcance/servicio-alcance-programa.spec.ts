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

  it('el cargador solo ve lo suyo: de sus programas o institucional (HU-010)', () => {
    expect(
      construirFiltroVisibilidad({ id: 'car', rol: RolUsuario.Cargador }, ['prog-1']),
    ).toEqual({
      autorId: 'car',
      OR: [{ programaId: { in: ['prog-1'] } }, { institucionId: { not: null } }],
    });
  });

  it('el revisor ve documentos no borrador de sus programas y los institucionales', () => {
    expect(
      construirFiltroVisibilidad({ id: 'rev', rol: RolUsuario.Revisor }, ['prog-2']),
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
