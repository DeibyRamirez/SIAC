import { RolUsuario } from '@prisma/client';
import {
  mensajePeriodoInvalido,
  motivoBloqueoCargaPeriodo,
  periodoAcademicoEnBogota,
  periodoDeFechaCalendario,
  periodoEsAnterior,
} from './periodo-academico';

describe('periodo académico en America/Bogota', () => {
  it('el 1 de enero a las 02:00 UTC sigue siendo 2026-2 en Bogotá', () => {
    expect(periodoAcademicoEnBogota(new Date('2027-01-01T02:00:00Z'))).toBe('2026-2');
  });

  it('el 1 de enero a las 05:00 UTC ya es 2027-1 en Bogotá', () => {
    expect(periodoAcademicoEnBogota(new Date('2027-01-01T05:00:00Z'))).toBe('2027-1');
  });

  it('el 1 de julio a las 04:30 UTC sigue en el primer semestre', () => {
    expect(periodoAcademicoEnBogota(new Date('2027-07-01T04:30:00Z'))).toBe('2027-1');
  });

  it('el 1 de julio a las 05:00 UTC abre el segundo semestre', () => {
    expect(periodoAcademicoEnBogota(new Date('2027-07-01T05:00:00Z'))).toBe('2027-2');
  });

  it('una fecha calendario de julio no retrocede al semestre anterior', () => {
    expect(periodoDeFechaCalendario('2026-06-30')).toBe('2026-1');
    expect(periodoDeFechaCalendario('2026-07-01')).toBe('2026-2');
    expect(periodoDeFechaCalendario('2020-03-01')).toBe('2020-1');
  });

  it('en 2027-2 el periodo 2026-2 es anterior y 2027-2 no lo es', () => {
    const agosto2027 = new Date('2027-08-15T15:00:00-05:00');
    expect(periodoAcademicoEnBogota(agosto2027)).toBe('2027-2');
    expect(periodoEsAnterior('2026-2', agosto2027)).toBe(true);
    expect(periodoEsAnterior('2027-1', agosto2027)).toBe(true);
    expect(periodoEsAnterior('2027-2', agosto2027)).toBe(false);
    expect(periodoEsAnterior('2028-1', agosto2027)).toBe(false);
  });

  it('bloquea al Cargador en un periodo cerrado y deja pasar a Revisor, Administrador y SuperAdmin', () => {
    const ahora = new Date('2027-08-15T15:00:00-05:00');
    expect(motivoBloqueoCargaPeriodo(RolUsuario.Cargador, '2026-2', ahora)).toMatch(/ya cerró/);
    expect(motivoBloqueoCargaPeriodo(RolUsuario.Cargador, '2026-2', ahora)).toMatch(/2027-2/);
    expect(motivoBloqueoCargaPeriodo(RolUsuario.Cargador, '2027-2', ahora)).toBeNull();
    expect(motivoBloqueoCargaPeriodo(RolUsuario.Revisor, '2026-2', ahora)).toBeNull();
    expect(motivoBloqueoCargaPeriodo(RolUsuario.Administrador, '2026-2', ahora)).toBeNull();
    expect(motivoBloqueoCargaPeriodo(RolUsuario.SuperAdmin, '2026-2', ahora)).toBeNull();
  });

  it('describe un formato inválido en español', () => {
    expect(mensajePeriodoInvalido('2026-3')).toContain('AAAA-1 o AAAA-2');
    expect(mensajePeriodoInvalido('2026-3')).toContain('2026-3');
  });
});
