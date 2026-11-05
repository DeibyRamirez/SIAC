import {
  calcularAvancePonderado,
  calcularSemaforoAvance,
  calcularSemaforoGeneral,
  calcularFechaFinVigencia,
  calcularHitosVigencia,
  calcularSemaforoVigencia,
  ColorSemaforoVigencia,
  UMBRALES_SEMAFORO_DEFECTO,
  validarPesosTramite,
  validarUmbralesSemaforo,
} from './panel-siac';
import { ColorSemaforo } from './puntaje-condiciones';

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

  describe('calcularSemaforoVigencia (CA1, umbrales 12/6, reloj falso)', () => {
    const fechaResolucion = new Date('2020-01-01T00:00:00.000Z');

    afterEach(() => {
      jest.useRealTimers();
    });

    it('fin 01/01/2027; verde hasta 31/12/2025, amarillo desde 01/01/2026, rojo desde 01/07/2026 y vencido desde 01/01/2027', () => {
      expect(calcularFechaFinVigencia(fechaResolucion).toISOString()).toBe(
        '2027-01-01T00:00:00.000Z',
      );

      // Límite verde/amarillo: exactamente 12 meses antes del fin.
      jest.useFakeTimers().setSystemTime(new Date('2025-12-31T23:59:59.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Verde');

      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Amarillo');

      // Límite amarillo/rojo: exactamente 6 meses antes del fin.
      jest.setSystemTime(new Date('2026-06-30T23:59:59.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Amarillo');

      jest.setSystemTime(new Date('2026-07-01T00:00:00.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Rojo');

      jest.setSystemTime(new Date('2026-12-31T23:59:59.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Rojo');

      jest.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Vencido');

      jest.setSystemTime(new Date('2028-06-01T00:00:00.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion)).toBe('Vencido');
    });

    it('con mesesRojoVigencia=6 (valor leído de BD) el rojo llega el 01/07/2026 sin redeploy', () => {
      const umbrales = {
        aniosVigencia: 7,
        mesesAvisoVigencia: 24,
        mesesRojoVigencia: 6,
      };
      jest.useFakeTimers().setSystemTime(new Date('2026-06-30T23:59:59.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion, new Date(), umbrales)).toBe('Amarillo');

      jest.setSystemTime(new Date('2026-07-01T00:00:00.000Z'));
      expect(calcularSemaforoVigencia(fechaResolucion, new Date(), umbrales)).toBe('Rojo');
    });

    it('sin resolución → SinVigencia (gris), nunca verde ni avisos', () => {
      expect(calcularSemaforoVigencia(null)).toBe('SinVigencia');
      expect(calcularSemaforoVigencia(undefined)).toBe('SinVigencia');
    });

    it('2020-03-01 → fin 2027-03-01; el 2026-10-06 está en rojo y el 2026-03-01 en amarillo', () => {
      const fecha = new Date('2020-03-01T00:00:00.000Z');
      expect(calcularFechaFinVigencia(fecha).toISOString()).toBe('2027-03-01T00:00:00.000Z');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-10-06T12:00:00Z'))).toBe('Rojo');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-08-31T23:59:59Z'))).toBe('Amarillo');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-09-01T00:00:00Z'))).toBe('Rojo');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-03-01T00:00:00Z'))).toBe('Amarillo');
      expect(calcularSemaforoVigencia(fecha, new Date('2026-02-28T23:59:59Z'))).toBe('Verde');
    });

    it('hitos: inicioAmarillo = fin − 12 meses, inicioRojo = fin − 6 meses', () => {
      const hitos = calcularHitosVigencia(fechaResolucion);
      expect(hitos.fin.toISOString()).toBe('2027-01-01T00:00:00.000Z');
      expect(hitos.inicioAmarillo.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(hitos.inicioRojo.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    });

    it('escala demo §0: 300 s = 7 años; amarillo a 258 s, rojo a 279 s y vencido a 300 s', () => {
      const inicioMs = Date.UTC(2026, 0, 1);
      const escala = { inicioMs, duracionMs: 300_000 };
      const enSegundo = (segundos: number) =>
        calcularSemaforoVigencia(
          fechaResolucion,
          new Date(inicioMs + segundos * 1000),
          UMBRALES_SEMAFORO_DEFECTO,
          escala,
        );
      expect(enSegundo(0)).toBe('Verde');
      expect(enSegundo(214)).toBe('Verde');
      expect(enSegundo(257)).toBe('Verde');
      expect(enSegundo(258)).toBe('Amarillo');
      expect(enSegundo(278)).toBe('Amarillo');
      expect(enSegundo(279)).toBe('Rojo');
      expect(enSegundo(299)).toBe('Rojo');
      expect(enSegundo(300)).toBe('Vencido');
    });
  });

  describe('calcularSemaforoGeneral (opción B, PO 13/10) — 30 casos', () => {
    // Tabla: vigencia × avance × RN-003 (anexo de Infraestructura vencido).
    const CASOS: Array<[ColorSemaforoVigencia, ColorSemaforo, boolean, ColorSemaforo]> = [
      // RN-003: no
      ['Verde', 'Verde', false, 'Verde'],
      ['Verde', 'Amarillo', false, 'Amarillo'],
      ['Verde', 'Rojo', false, 'Rojo'],
      ['Amarillo', 'Verde', false, 'Amarillo'],
      ['Amarillo', 'Amarillo', false, 'Amarillo'],
      ['Amarillo', 'Rojo', false, 'Rojo'],
      ['Rojo', 'Verde', false, 'Rojo'],
      ['Rojo', 'Amarillo', false, 'Rojo'],
      ['Rojo', 'Rojo', false, 'Rojo'],
      ['Vencido', 'Verde', false, 'Rojo'],
      ['Vencido', 'Amarillo', false, 'Rojo'],
      ['Vencido', 'Rojo', false, 'Rojo'],
      // SinVigencia: manda el avance (nunca gris como color general)
      ['SinVigencia', 'Verde', false, 'Verde'],
      ['SinVigencia', 'Amarillo', false, 'Amarillo'],
      ['SinVigencia', 'Rojo', false, 'Rojo'],
      // RN-003: sí (anexo Infraestructura vencido fuerza Rojo)
      ['Verde', 'Verde', true, 'Rojo'],
      ['Verde', 'Amarillo', true, 'Rojo'],
      ['Verde', 'Rojo', true, 'Rojo'],
      ['Amarillo', 'Verde', true, 'Rojo'],
      ['Amarillo', 'Amarillo', true, 'Rojo'],
      ['Amarillo', 'Rojo', true, 'Rojo'],
      ['Rojo', 'Verde', true, 'Rojo'],
      ['Rojo', 'Amarillo', true, 'Rojo'],
      ['Rojo', 'Rojo', true, 'Rojo'],
      ['Vencido', 'Verde', true, 'Rojo'],
      ['Vencido', 'Amarillo', true, 'Rojo'],
      ['Vencido', 'Rojo', true, 'Rojo'],
      ['SinVigencia', 'Verde', true, 'Rojo'],
      ['SinVigencia', 'Amarillo', true, 'Rojo'],
      ['SinVigencia', 'Rojo', true, 'Rojo'],
    ];

    it('la tabla cubre los 30 casos (5 vigencias × 3 avances × 2 RN-003)', () => {
      expect(CASOS).toHaveLength(30);
      const combinaciones = new Set(CASOS.map(([v, a, rn]) => `${v}|${a}|${rn}`));
      expect(combinaciones.size).toBe(30);
    });

    it.each(CASOS)(
      'vigencia %s + avance %s + RN-003 %s → %s',
      (vigencia, avance, rn003, esperado) => {
        expect(calcularSemaforoGeneral(avance, vigencia, rn003)).toBe(esperado);
      },
    );
  });

  describe('validarUmbralesSemaforo', () => {
    it('acepta los valores por defecto (100/55, 7 años, aviso 12, rojo 6)', () => {
      expect(() => validarUmbralesSemaforo(UMBRALES_SEMAFORO_DEFECTO)).not.toThrow();
      expect(UMBRALES_SEMAFORO_DEFECTO.mesesAvisoVigencia).toBe(12);
      expect(UMBRALES_SEMAFORO_DEFECTO.mesesRojoVigencia).toBe(6);
    });

    it('rechaza amarillo ≥ verde, aviso mayor que la vigencia o aviso ≤ rojo', () => {
      expect(
        () => validarUmbralesSemaforo({ ...UMBRALES_SEMAFORO_DEFECTO, minimoAmarillo: 100 }),
      ).toThrow(/incoherentes/);
      expect(
        () => validarUmbralesSemaforo({ ...UMBRALES_SEMAFORO_DEFECTO, mesesAvisoVigencia: 84 }),
      ).toThrow(/mesesAvisoVigencia/);
      expect(
        () =>
          validarUmbralesSemaforo({
            ...UMBRALES_SEMAFORO_DEFECTO,
            mesesAvisoVigencia: 18,
            mesesRojoVigencia: 18,
          }),
      ).toThrow(/mesesAvisoVigencia/);
      expect(
        () => validarUmbralesSemaforo({ ...UMBRALES_SEMAFORO_DEFECTO, mesesRojoVigencia: -1 }),
      ).toThrow(/mesesRojoVigencia/);
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
