import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import {
  construirFiltroVisibilidad,
  filtroBorradorSoloAutor,
  puedeVerBorrador,
  rolPuedeDictaminar,
} from './servicio-alcance-programa';

const soloAutor = (id: string) => ({
  OR: [{ estado: { not: EstadoEvidencia.Borrador } }, { autorId: id }],
});

describe('construirFiltroVisibilidad (alcance por rol + borradores solo del autor)', () => {
  it('superadmin: sin restricción de alcance, pero no ve borradores ajenos', () => {
    expect(construirFiltroVisibilidad({ id: 'sa', rol: RolUsuario.SuperAdmin }, [])).toEqual({
      AND: [{}, soloAutor('sa')],
    });
  });

  it('administrador: igual que superadmin (ya no ve borradores ajenos aunque tengan historial)', () => {
    expect(construirFiltroVisibilidad({ id: 'adm', rol: RolUsuario.Administrador }, [])).toEqual({
      AND: [{}, soloAutor('adm')],
    });
  });

  it('cargador: solo lo propio dentro de sus programas asignados', () => {
    expect(construirFiltroVisibilidad({ id: 'c1', rol: RolUsuario.Cargador }, ['p1', 'p2'])).toEqual({
      AND: [{ autorId: 'c1', OR: [{ programaId: { in: ['p1', 'p2'] } }] }, soloAutor('c1')],
    });
  });

  it('cargador responsable institucional: además G3/G4 propias', () => {
    expect(construirFiltroVisibilidad({ id: 'c1', rol: RolUsuario.Cargador }, ['p1'], true)).toEqual({
      AND: [
        {
          autorId: 'c1',
          OR: [{ programaId: { in: ['p1'] } }, { institucionId: { not: null } }],
        },
        soloAutor('c1'),
      ],
    });
  });

  it('cargador sin programas ni responsabilidad institucional: no ve nada', () => {
    expect(construirFiltroVisibilidad({ id: 'c1', rol: RolUsuario.Cargador }, [])).toEqual({
      id: { in: [] },
    });
  });

  it('revisor: sus programas, sin borradores ajenos', () => {
    expect(construirFiltroVisibilidad({ id: 'r1', rol: RolUsuario.Revisor }, ['p1'])).toEqual({
      AND: [{ OR: [{ programaId: { in: ['p1'] } }] }, soloAutor('r1')],
    });
  });

  it('revisor responsable institucional: también evidencias G3/G4', () => {
    expect(construirFiltroVisibilidad({ id: 'r1', rol: RolUsuario.Revisor }, [], true)).toEqual({
      AND: [{ OR: [{ institucionId: { not: null } }] }, soloAutor('r1')],
    });
  });

  it('revisor sin alcance: no ve nada', () => {
    expect(construirFiltroVisibilidad({ id: 'r1', rol: RolUsuario.Revisor }, [])).toEqual({
      id: { in: [] },
    });
  });

  it('todos los roles con alcance llevan la condición de borrador del propio usuario', () => {
    for (const rol of [RolUsuario.SuperAdmin, RolUsuario.Administrador, RolUsuario.Cargador, RolUsuario.Revisor]) {
      const filtro = construirFiltroVisibilidad({ id: `u-${rol}`, rol }, ['p1']);
      expect(filtro.AND).toContainEqual(filtroBorradorSoloAutor(`u-${rol}`));
    }
  });
});

describe('puedeVerBorrador', () => {
  it('el autor ve su borrador; nadie más, sea cual sea su rol', () => {
    const borrador = { estado: EstadoEvidencia.Borrador, autorId: 'c1' };
    expect(puedeVerBorrador(borrador, 'c1')).toBe(true);
    expect(puedeVerBorrador(borrador, 'admin')).toBe(false);
    expect(puedeVerBorrador(borrador, 'superadmin')).toBe(false);
  });

  it('fuera de Borrador no aplica la restricción', () => {
    for (const estado of [EstadoEvidencia.EnRevision, EstadoEvidencia.Validado, EstadoEvidencia.Rechazado]) {
      expect(puedeVerBorrador({ estado, autorId: 'c1' }, 'admin')).toBe(true);
    }
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
