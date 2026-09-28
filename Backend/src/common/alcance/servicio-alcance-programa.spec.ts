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

  it('el cargador solo ve lo suyo dentro de sus programas', () => {
    expect(
      construirFiltroVisibilidad({ id: 'car', rol: RolUsuario.Cargador }, ['prog-1']),
    ).toEqual({
      autorId: 'car',
      programaId: { in: ['prog-1'] },
    });
  });

  it('el revisor solo ve documentos no borrador de sus programas', () => {
    expect(
      construirFiltroVisibilidad({ id: 'rev', rol: RolUsuario.Revisor }, ['prog-2']),
    ).toEqual({
      programaId: { in: ['prog-2'] },
      estado: { not: EstadoEvidencia.Borrador },
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
