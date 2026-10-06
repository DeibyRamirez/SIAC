import { EstadoVigencia } from '@prisma/client';
import { calcularEstadoAnexo, conEstadoCalculado } from './vigencia-anexo';

describe('calcularEstadoAnexo (R-D)', () => {
  const hoy = new Date(2026, 9, 6, 10, 0, 0);

  it('una fecha pasada es Vencido aunque la columna diga Vigente', () => {
    const anexo = { estado: EstadoVigencia.Vigente, fechaVencimiento: new Date(2026, 8, 1) };
    expect(conEstadoCalculado(anexo, hoy).estado).toBe(EstadoVigencia.Vencido);
  });

  it('vence hoy → Próximo; vence en 30 días → Próximo; en 31 → Vigente', () => {
    expect(calcularEstadoAnexo(new Date(2026, 9, 6), hoy)).toBe(EstadoVigencia.Proximo);
    expect(calcularEstadoAnexo(new Date(2026, 10, 5), hoy)).toBe(EstadoVigencia.Proximo);
    expect(calcularEstadoAnexo(new Date(2026, 10, 6), hoy)).toBe(EstadoVigencia.Vigente);
  });

  it('ayer → Vencido; 2030 → Vigente', () => {
    expect(calcularEstadoAnexo(new Date(2026, 9, 5), hoy)).toBe(EstadoVigencia.Vencido);
    expect(calcularEstadoAnexo(new Date(2030, 8, 1), hoy)).toBe(EstadoVigencia.Vigente);
  });
});
