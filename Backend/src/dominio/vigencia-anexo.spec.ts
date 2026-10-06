import { CategoriaAnexo, EstadoVigencia } from '@prisma/client';
import {
  calcularEstadoAnexo,
  calcularVencimientoAnexo,
  conEstadoCalculado,
  hayAnexoInfraestructuraVencido,
} from './vigencia-anexo';

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

describe('hayAnexoInfraestructuraVencido (RN-003 con categoría explícita)', () => {
  const hoy = new Date(2026, 9, 6, 10, 0, 0);
  const vencido = new Date(2026, 8, 1);
  const vigente = new Date(2030, 8, 1);

  it('solo cuenta los anexos de categoría Infraestructura vencidos', () => {
    expect(hayAnexoInfraestructuraVencido([{ categoria: CategoriaAnexo.Infraestructura, fechaVencimiento: vencido }], hoy)).toBe(true);
    expect(hayAnexoInfraestructuraVencido([{ categoria: CategoriaAnexo.Permiso, fechaVencimiento: vencido }], hoy)).toBe(false);
    expect(hayAnexoInfraestructuraVencido([{ categoria: CategoriaAnexo.Infraestructura, fechaVencimiento: vigente }], hoy)).toBe(false);
    expect(hayAnexoInfraestructuraVencido([], hoy)).toBe(false);
  });
});

describe('calcularVencimientoAnexo (vencimiento desde el certificado)', () => {
  it('prioriza la fecha de vencimiento del certificado', () => {
    const fecha = new Date('2026-09-01T00:00:00Z');
    expect(calcularVencimientoAnexo({ fechaVencimiento: fecha, fechaExpedicion: new Date('2020-01-01T00:00:00Z'), aniosVigencia: 7 })).toBe(fecha);
  });

  it('sin vencimiento usa expedición + años; sin datos devuelve null', () => {
    expect(
      calcularVencimientoAnexo({ fechaExpedicion: new Date('2021-03-15T00:00:00Z'), aniosVigencia: 5 })?.toISOString().slice(0, 10),
    ).toBe('2026-03-15');
    expect(calcularVencimientoAnexo({ aniosVigencia: 7 })).toBeNull();
  });
});
