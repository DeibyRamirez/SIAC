import {
  calcularAvancePonderado,
  calcularSemaforoAvance,
  calcularSemaforoGeneral,
  calcularSemaforoVigencia,
  validarPesosTramite,
} from './panel-siac';

describe('panel-siac', () => {
  describe('calcularAvancePonderado', () => {
    it('renovación programa G1 8/9 y G2 70% con pesos 90/10', () => {
      const g1Pct = (8 / 9) * 100;
      const avance = calcularAvancePonderado([
        { codigoGuia: 'G1', porcentajeInterno: g1Pct, peso: 90 },
        { codigoGuia: 'G2', porcentajeInterno: 70, peso: 10 },
      ]);
      const esperado = g1Pct * 0.9 + 70 * 0.1;
      expect(avance).toBeCloseTo(esperado, 1);
    });

    it('nuevo con G1 100% y peso 100%', () => {
      expect(
        calcularAvancePonderado([{ codigoGuia: 'G1', porcentajeInterno: 100, peso: 100 }]),
      ).toBe(100);
    });
  });

  describe('calcularSemaforoAvance', () => {
    it('100% => verde', () => {
      expect(calcularSemaforoAvance(100)).toBe('Verde');
    });

    it('55% => amarillo', () => {
      expect(calcularSemaforoAvance(55)).toBe('Amarillo');
    });

    it('54.99% => rojo', () => {
      expect(calcularSemaforoAvance(54.99)).toBe('Rojo');
    });
  });

  describe('calcularSemaforoGeneral', () => {
    it('RN-003 fuerza rojo aunque avance sea 100%', () => {
      expect(calcularSemaforoGeneral('Verde', 'Verde', true)).toBe('Rojo');
    });
  });

  describe('calcularSemaforoVigencia', () => {
    const base = new Date('2020-01-01');

    it('verde antes del año 6', () => {
      const ref = new Date('2025-06-01');
      expect(calcularSemaforoVigencia(base, ref)).toBe('Verde');
    });

    it('amarillo desde el año 6', () => {
      const ref = new Date('2026-06-01');
      expect(calcularSemaforoVigencia(base, ref)).toBe('Amarillo');
    });

    it('rojo después de 7 años', () => {
      const ref = new Date('2028-01-02');
      expect(calcularSemaforoVigencia(base, ref)).toBe('Rojo');
    });
  });

  describe('validarPesosTramite', () => {
    it('acepta pesos que suman 100', () => {
      expect(() => validarPesosTramite([90, 10])).not.toThrow();
    });

    it('rechaza pesos que no suman 100', () => {
      expect(() => validarPesosTramite([90, 5])).toThrow();
    });
  });
});
