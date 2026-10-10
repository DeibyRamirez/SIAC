import { describe, expect, it } from 'vitest'

import {
  ANIOS_VIGENCIA_AMARILLO,
  ANIOS_VIGENCIA_REGISTRO,
  calcularFechaFinVigencia,
  calcularPorcentajeVigencia,
  calcularSemaforoAvance,
  calcularSemaforoVigencia,
  mensajeAlertaVigencia,
} from './vigencia-registro'

describe('vigencia-registro', () => {
  it('calcula semáforo de avance documental', () => {
    expect(calcularSemaforoAvance(100)).toBe('Verde')
    expect(calcularSemaforoAvance(55)).toBe('Amarillo')
    expect(calcularSemaforoAvance(54)).toBe('Rojo')
  })

  it('sin fecha de resolución es «SinVigencia» (gris), nunca verde', () => {
    expect(calcularSemaforoVigencia(null)).toBe('SinVigencia')
    expect(calcularPorcentajeVigencia(null)).toBe(0)
    expect(mensajeAlertaVigencia(null, 'Derecho')).toBeNull()
  })

  it('resolución 2020-03-01 → fin 2027-03-01 y amarillo el 2026-10-06', () => {
    expect(calcularFechaFinVigencia('2020-03-01T00:00:00.000Z').toISOString()).toBe('2027-03-01T00:00:00.000Z')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-10-06T12:00:00Z'))).toBe('Amarillo')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2026-02-28T12:00:00Z'))).toBe('Verde')
    expect(calcularSemaforoVigencia('2020-03-01T00:00:00.000Z', new Date('2027-03-01T00:00:00Z'))).toBe('Rojo')
  })

  it('marca amarillo a partir del año 6', () => {
    const referencia = new Date('2026-01-01')
    const inicio = new Date(referencia)
    inicio.setFullYear(inicio.getFullYear() - ANIOS_VIGENCIA_AMARILLO)
    expect(calcularSemaforoVigencia(inicio.toISOString(), referencia)).toBe('Amarillo')
  })

  it('marca rojo después de 7 años', () => {
    const referencia = new Date('2026-01-01')
    const inicio = new Date(referencia)
    inicio.setFullYear(inicio.getFullYear() - (ANIOS_VIGENCIA_REGISTRO + 0.5))
    expect(calcularSemaforoVigencia(inicio.toISOString(), referencia)).toBe('Rojo')
  })

  it('genera alerta en año 6 o más', () => {
    const referencia = new Date('2026-06-01')
    const msSeisAnios = ANIOS_VIGENCIA_AMARILLO * 365.25 * 24 * 60 * 60 * 1000
    const inicio = new Date(referencia.getTime() - msSeisAnios)
    const mensaje = mensajeAlertaVigencia(inicio.toISOString(), 'Derecho', referencia)
    expect(mensaje).toContain('Próximo al proceso de renovación')
    expect(mensaje).toContain('Derecho')
  })
})
