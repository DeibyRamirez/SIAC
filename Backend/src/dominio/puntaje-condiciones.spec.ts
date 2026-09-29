import { EstadoEvidencia } from '@prisma/client';
import {
  colorMasCritico,
  colorPorPuntaje,
  estadoPorPuntaje,
  formatearPuntaje,
  resolverChecklist,
} from './puntaje-condiciones';

describe('regla n/9 (HU-003)', () => {
  it('9/9 queda en Cumple', () => {
    expect(estadoPorPuntaje(9, 9)).toBe(EstadoEvidencia.Cumple);
  });

  it.each([0, 4, 5, 8])('%i/9 queda en Con observaciones y nunca en Rechazado', (puntaje) => {
    const estado = estadoPorPuntaje(puntaje, 9);
    expect(estado).toBe(EstadoEvidencia.ConObservaciones);
    expect(estado).not.toBe(EstadoEvidencia.Rechazado);
  });

  it('G3 institucional usa n/6', () => {
    expect(estadoPorPuntaje(6, 6)).toBe(EstadoEvidencia.Cumple);
    expect(estadoPorPuntaje(5, 6)).toBe(EstadoEvidencia.ConObservaciones);
  });

  it('resuelve un checklist binario con puntaje entero', () => {
    const condiciones = [true, true, false, true, true, false, true, false, false].map((cumple) => ({
      cumple,
    }));
    expect(resolverChecklist(condiciones, 9)).toEqual({
      puntaje: 5,
      totalCondiciones: 9,
      estado: EstadoEvidencia.ConObservaciones,
    });
  });

  it('rechaza puntajes fuera de rango', () => {
    expect(() => estadoPorPuntaje(10, 9)).toThrow(RangeError);
    expect(() => estadoPorPuntaje(-1, 9)).toThrow(RangeError);
    expect(() => estadoPorPuntaje(2.5, 9)).toThrow(RangeError);
  });

  it('formatea el puntaje como n/total', () => {
    expect(formatearPuntaje(5, 9)).toBe('5/9');
  });
});

describe('semáforo por puntaje (D2)', () => {
  it.each([
    [9, 'Verde'],
    [8, 'Amarillo'],
    [5, 'Amarillo'],
    [4, 'Rojo'],
    [0, 'Rojo'],
  ])('%i/9 => %s', (puntaje, color) => {
    expect(colorPorPuntaje(puntaje as number, 9)).toBe(color);
  });

  it('un documento con observaciones (5-8) no queda en rojo', () => {
    for (const puntaje of [5, 6, 7, 8]) {
      expect(colorPorPuntaje(puntaje, 9)).not.toBe('Rojo');
    }
  });

  it('escala los umbrales para n/6', () => {
    expect(colorPorPuntaje(6, 6)).toBe('Verde');
    expect(colorPorPuntaje(4, 6)).toBe('Amarillo');
    expect(colorPorPuntaje(3, 6)).toBe('Rojo');
  });

  it('acepta umbrales configurados', () => {
    expect(colorPorPuntaje(7, 9, { minimoVerde: 7, minimoAmarillo: 3 })).toBe('Verde');
  });

  it('elige el color más crítico', () => {
    expect(colorMasCritico(['Verde', 'Amarillo'])).toBe('Amarillo');
    expect(colorMasCritico(['Verde', 'Rojo', 'Amarillo'])).toBe('Rojo');
    expect(colorMasCritico([])).toBe('Verde');
  });
});
