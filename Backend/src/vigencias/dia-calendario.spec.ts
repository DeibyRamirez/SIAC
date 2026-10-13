import { diaCalendarioLocal } from './vigencias.service';

describe('diaCalendarioLocal (cron de vigencias)', () => {
  it('usa el día calendario local y no el de UTC', () => {
    // 13/10 a las 22:00 locales: en UTC-5 ya es 14/10, pero mañana local es 14/10.
    const base = new Date(2026, 9, 13, 22, 0, 0);
    expect(diaCalendarioLocal(0, base)).toBe('2026-10-13');
    expect(diaCalendarioLocal(1, base)).toBe('2026-10-14');
  });

  it('cruza fin de mes y de año', () => {
    expect(diaCalendarioLocal(1, new Date(2026, 11, 31, 12))).toBe('2027-01-01');
  });
});