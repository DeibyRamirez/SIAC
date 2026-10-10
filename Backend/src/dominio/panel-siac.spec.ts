import {
  calcularAvancePonderado,
  calcularSemaforoAvance,
  calcularSemaforoGeneral,
  calcularFechaFinVigencia,
  calcularSemaforoVigencia,
  UMBRALES_SEMAFORO_DEFECTO,
  validarPesosTramite,
  validarUmbralesSemaforo,
} from './panel-siac';

describe('panel-siac', () => {
  describe('calcularAvancePonderado', () => {
    it('renovación programa G1 8/9 y G2 sin aprobar (0 %) con pesos 90/10 = 80,0', () => {
      const g1Pct = (8 / 9) * 100;
      const avance = calcularAvancePonderado([
        { codigoGuia: 'G1', porcentajeInterno: g1Pct, peso: 90 },
        { codigoGuia: 'G2', porcentajeInterno: 0, peso: 10 },
      ]);
      expect(avance).toBe(80);
    });

    it('renovación programa G1 9/9 y G2 aprobado (100 %) = 100', () => {
      const avance = calcularAvancePonderado([
        { codigoGuia: 'G1', porcentajeInterno: 100, peso: 90 },
        { codigoGuia: 'G2', porcentajeInterno: 100, peso: 10 },
      ]);
      expect(avance).toBe(100);
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

    it('rojo cuando la vigencia ya terminó', () => {
      expect(calcularSemaforoVigencia(base, new Date('2027-01-01'))).toBe('Rojo');
      expect(calcularSemaforoVigencia(base, new Date('2028-01-02'))).toBe('Rojo');
    });

    it('sin resolución → SinVigencia (gris), nunca verde', () => {
      expect(calcularSemaforoVigencia(null)).toBe('SinVigencia');
      expect(calcularSemaforoVigencia(undefined)).toBe('SinVigencia');
    });

    it('2020-03-01 → fin 2027-03-01 y el 2026-10-06 está en amarillo', () => {
      const fecha = new Date('2020-03-01T00:00:00.000Z');
      expect(calcularFechaFinVigencia(fecha).toISOString()).toBe('2027-03-01T00:00:00.000Z');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-10-06T12:00:00Z'))).toBe('Amarillo');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-02-28T12:00:00Z'))).toBe('Verde');
    });

    it('respeta umbrales configurados (aviso 24 meses)', () => {
      const fecha = new Date('2020-03-01T00:00:00.000Z');
      const umbrales = { aniosVigencia: 7, mesesAvisoVigencia: 24 };
      expect(calcularSemaforoVigencia(fecha, new Date('2025-06-01'), umbrales)).toBe('Amarillo');
    });
  });

  describe('calcularSemaforoGeneral con SinVigencia', () => {
    it('sin vigencia no empeora el avance, pero RN-003 sigue forzando rojo', () => {
      expect(calcularSemaforoGeneral('Amarillo', 'SinVigencia', false)).toBe('Amarillo');
      expect(calcularSemaforoGeneral('Verde', 'SinVigencia', true)).toBe('Rojo');
    });
  });

  describe('validarUmbralesSemaforo', () => {
    it('acepta los valores por defecto', () => {
      expect(() => validarUmbralesSemaforo(UMBRALES_SEMAFORO_DEFECTO)).not.toThrow();
    });

    it('rechaza amarillo ≥ verde o aviso mayor que la vigencia', () => {
      expect(() => validarUmbralesSemaforo({ ...UMBRALES_SEMAFORO_DEFECTO, minimoAmarillo: 100 })).toThrow(
        /incoherentes/,
      );
      expect(() => validarUmbralesSemaforo({ ...UMBRALES_SEMAFORO_DEFECTO, mesesAvisoVigencia: 84 })).toThrow(
        /mesesAvisoVigencia/,
      );
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
