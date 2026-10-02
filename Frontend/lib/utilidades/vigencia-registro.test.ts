import { describe, expect, it } from 'vitest'

import {
  ANIOS_VIGENCIA_AMARILLO,
  ANIOS_VIGENCIA_REGISTRO,
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

  it('retorna verde sin fecha de resolución', () => {
    expect(calcularSemaforoVigencia(null)).toBe('Verde')
    expect(calcularPorcentajeVigencia(null)).toBe(0)
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
