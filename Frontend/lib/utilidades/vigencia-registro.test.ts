import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ANIOS_VIGENCIA_AMARILLO,
  ANIOS_VIGENCIA_REGISTRO,
  DURACION_DEMO_VIGENCIA_MS,
  MESES_AVISO_VIGENCIA,
  MESES_ROJO_VIGENCIA,
  calcularFechaFinVigencia,
  calcularPorcentajeVigencia,
  calcularReferenciaDemoVigencia,
  calcularSemaforoAvance,
  calcularSemaforoVigencia,
  claveSessionDemoVigencia,
  demoVigenciaFinalizada,
  fraccionDemoVigenciaTranscurrida,
  hayDemoVigenciaEnCurso,
  mensajeAlertaVigencia,
} from './vigencia-registro'

describe('vigencia-registro', () => {
  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('calcula semáforo de avance documental', () => {
    expect(calcularSemaforoAvance(100)).toBe('Verde')
    expect(calcularSemaforoAvance(55)).toBe('Amarillo')
    expect(calcularSemaforoAvance(54)).toBe('Rojo')
  })

  it('usa los umbrales vigentes: aviso 12 meses y rojo 6 meses', () => {
    expect(MESES_AVISO_VIGENCIA).toBe(12)
    expect(MESES_ROJO_VIGENCIA).toBe(6)
    expect(ANIOS_VIGENCIA_AMARILLO).toBe(6)
  })

  it('sin fecha de resolución es «SinVigencia» (gris), nunca verde', () => {
    expect(calcularSemaforoVigencia(null)).toBe('SinVigencia')
    expect(calcularPorcentajeVigencia(null)).toBe(0)
    expect(mensajeAlertaVigencia(null, 'Derecho')).toBeNull()
  })

  it('CA1: resolución 2020-01-01 → verde hasta 31/12/2025, amarillo desde 01/01/2026, rojo desde 01/07/2026 y vencido desde 01/01/2027', () => {
    const fecha = '2020-01-01T00:00:00.000Z'
    expect(calcularFechaFinVigencia(fecha).toISOString()).toBe('2027-01-01T00:00:00.000Z')
    expect(calcularSemaforoVigencia(fecha, new Date('2025-12-31T23:59:59Z'))).toBe('Verde')
    expect(calcularSemaforoVigencia(fecha, new Date('2026-01-01T00:00:00Z'))).toBe('Amarillo')
    expect(calcularSemaforoVigencia(fecha, new Date('2026-06-30T23:59:59Z'))).toBe('Amarillo')
    expect(calcularSemaforoVigencia(fecha, new Date('2026-07-01T00:00:00Z'))).toBe('Rojo')
    expect(calcularSemaforoVigencia(fecha, new Date('2026-12-31T23:59:59Z'))).toBe('Rojo')
    expect(calcularSemaforoVigencia(fecha, new Date('2027-01-01T00:00:00Z'))).toBe('Vencido')
  })

  it('resolución 2020-03-01 → fin 2027-03-01 y rojo el 2026-10-06', () => {
    expect(calcularFechaFinVigencia('2020-03-01T00:00:00.000Z').toISOString()).toBe('2027-03-01T00:00:00.000Z')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-10-06T12:00:00Z'))).toBe('Rojo')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-02-28T12:00:00Z'))).toBe('Verde')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-03-01T00:00:00Z'))).toBe('Amarillo')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-08-31T23:59:59Z'))).toBe('Amarillo')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-09-01T00:00:00Z'))).toBe('Rojo')
  })

  it('marca amarillo a partir del año 6 cumplido (12 meses antes del fin)', () => {
    const referencia = new Date('2026-01-01')
    const inicio = new Date(referencia)
    inicio.setFullYear(inicio.getFullYear() - ANIOS_VIGENCIA_AMARILLO)
    expect(calcularSemaforoVigencia(inicio.toISOString(), referencia)).toBe('Amarillo')
  })

  it('marca Vencido después de 7 años (distinto de Rojo)', () => {
    const referencia = new Date('2026-01-01')
    const inicio = new Date(referencia)
    inicio.setFullYear(inicio.getFullYear() - (ANIOS_VIGENCIA_REGISTRO + 0.5))
    expect(calcularSemaforoVigencia(inicio.toISOString(), referencia)).toBe('Vencido')
  })

  it('demo 5 min: referencia y porcentaje en inicio y al final', () => {
    const fechaResolucion = '2020-03-01T00:00:00.000Z'
    const inicioDemo = 1_700_000_000_000
    const ref0 = calcularReferenciaDemoVigencia(fechaResolucion, inicioDemo, inicioDemo)
    expect(ref0.toISOString()).toBe('2020-03-01T00:00:00.000Z')
    expect(calcularPorcentajeVigencia(fechaResolucion, ref0)).toBe(0)

    const alFinal = inicioDemo + DURACION_DEMO_VIGENCIA_MS
    const refFin = calcularReferenciaDemoVigencia(fechaResolucion, inicioDemo, alFinal)
    expect(refFin.toISOString()).toBe(calcularFechaFinVigencia(fechaResolucion).toISOString())
    expect(calcularPorcentajeVigencia(fechaResolucion, refFin)).toBe(100)
    expect(fraccionDemoVigenciaTranscurrida(inicioDemo, alFinal)).toBe(1)
    expect(demoVigenciaFinalizada(inicioDemo, alFinal)).toBe(true)
  })

  it('demo 5 min: amarillo a ~258 s, rojo a ~279 s y vencido a 300 s', () => {
    const fechaResolucion = '2020-01-01T00:00:00.000Z'
    const inicioDemo = 1_700_000_000_000
    const s = (segundos: number) =>
      calcularSemaforoVigencia(
        fechaResolucion,
        calcularReferenciaDemoVigencia(fechaResolucion, inicioDemo, inicioDemo + segundos * 1000),
      )
    expect(s(0)).toBe('Verde')
    expect(s(214)).toBe('Verde')
    expect(s(257)).toBe('Verde')
    expect(s(258)).toBe('Amarillo')
    expect(s(278)).toBe('Amarillo')
    expect(s(279)).toBe('Rojo')
    expect(s(299)).toBe('Rojo')
    expect(s(300)).toBe('Vencido')
  })

  it('demo 5 min: punto intermedio avanza la referencia', () => {
    const fechaResolucion = '2020-03-01T00:00:00.000Z'
    const inicioDemo = 0
    const mitad = inicioDemo + DURACION_DEMO_VIGENCIA_MS / 2
    const ref = calcularReferenciaDemoVigencia(fechaResolucion, inicioDemo, mitad)
    const pct = calcularPorcentajeVigencia(fechaResolucion, ref)
    expect(pct).toBeGreaterThan(45)
    expect(pct).toBeLessThan(55)
  })

  it('genera alerta en ventana de renovación y vencido', () => {
    const referencia = new Date('2026-06-01')
    const msCincoAnios = ANIOS_VIGENCIA_AMARILLO * 365.25 * 24 * 60 * 60 * 1000
    const inicio = new Date(referencia.getTime() - msCincoAnios)
    const mensaje = mensajeAlertaVigencia(inicio.toISOString(), 'Derecho', referencia)
    expect(mensaje).toContain('Próximo al proceso de renovación')
    expect(mensaje).toContain('Derecho')

    const viejo = new Date(referencia)
    viejo.setFullYear(viejo.getFullYear() - 8)
    expect(mensajeAlertaVigencia(viejo.toISOString(), 'Derecho', referencia)).toContain(
      'superado los 7 años',
    )
  })

  it('detecta una demo activa por las claves de sessionStorage (polling 5 s)', () => {
    expect(hayDemoVigenciaEnCurso()).toBe(false)
    sessionStorage.setItem(claveSessionDemoVigencia('prog-1'), String(Date.now()))
    expect(hayDemoVigenciaEnCurso()).toBe(true)
    sessionStorage.clear()
    expect(hayDemoVigenciaEnCurso()).toBe(false)
  })
})
