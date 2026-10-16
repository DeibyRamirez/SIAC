import { calcularSemaforoVigencia, UMBRALES_SEMAFORO_DEFECTO } from '../dominio/panel-siac';
import { calcularReferenciaDemoVigencia } from './paquetes-registro-vigencia.service';

describe('Evaluador vigencia registro (escala demo 7 min)', () => {
  const fechaResolucion = new Date('2020-06-01T12:00:00.000Z');
  const duracionSeg = 420;
  const umbrales = UMBRALES_SEMAFORO_DEFECTO;

  it('al inicio de la demo el semáforo es verde', () => {
    const inicio = Date.now();
    const ref = calcularReferenciaDemoVigencia(fechaResolucion, inicio, inicio, duracionSeg, 7);
    expect(calcularSemaforoVigencia(fechaResolucion, ref, umbrales)).toBe('Verde');
  });

  it('cerca del año 6 simulado entra en amarillo', () => {
    const inicio = Date.now();
    const ref = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + Math.floor(duracionSeg * 0.88) * 1000,
      duracionSeg,
      7,
    );
    expect(calcularSemaforoVigencia(fechaResolucion, ref, umbrales)).toBe('Amarillo');
  });

  it('al final de la demo el semáforo es rojo (vencido)', () => {
    const inicio = Date.now();
    const ref = calcularReferenciaDemoVigencia(
      fechaResolucion,
      inicio,
      inicio + duracionSeg * 1000,
      duracionSeg,
      7,
    );
    expect(calcularSemaforoVigencia(fechaResolucion, ref, umbrales)).toBe('Rojo');
  });
});
