import { afterEach, describe, expect, it, vi } from 'vitest'

import { categoriasInformesPowerBi } from '@/lib/informes-powerbi'
import {
  esUrlPublicaPowerBiValida,
  obtenerModoPowerBi,
  resolverUrlPowerBi,
} from '@/lib/powerbi/configuracion-powerbi'
import { puedeVerInformesPowerBi } from '@/lib/powerbi/acceso-powerbi'

const URL_EJEMPLO = 'https://app.powerbi.com/view?r=ejemploDePrueba123'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('catálogo de informes Power BI', () => {
  it('tiene las 6 categorías con su variable de entorno', () => {
    expect(categoriasInformesPowerBi.map((c) => c.id)).toEqual([
      'aseguramiento',
      'infraestructura',
      'egresados',
      'investigacion',
      'profesores',
      'estudiantes',
    ])
    for (const categoria of categoriasInformesPowerBi) {
      expect(categoria.variableEntorno).toBe(
        `NEXT_PUBLIC_POWERBI_URL_${categoria.id.toUpperCase()}`,
      )
    }
  })
})

describe('validación de URL pública', () => {
  it('acepta una URL de «Publicar en la web»', () => {
    expect(esUrlPublicaPowerBiValida(URL_EJEMPLO)).toBe(true)
  })

  it.each([
    '',
    'http://app.powerbi.com/view?r=abc',
    'https://app.powerbi.com/reportEmbed?reportId=abc',
    'https://app.powerbi.com.malicioso.co/view?r=abc',
    'https://evil.com/?u=https://app.powerbi.com/view?r=abc',
    'https://app.powerbi.com/view?r=',
    'javascript:alert(1)',
  ])('rechaza %s', (url) => {
    expect(esUrlPublicaPowerBiValida(url)).toBe(false)
  })

  it('resuelve publicada, no publicada e inválida por categoría', () => {
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_EGRESADOS', URL_EJEMPLO)
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_PROFESORES', 'https://ejemplo.com/informe')
    vi.stubEnv('NEXT_PUBLIC_POWERBI_URL_ASEGURAMIENTO', '')
    expect(resolverUrlPowerBi('egresados')).toEqual({ estado: 'publicada', url: URL_EJEMPLO })
    expect(resolverUrlPowerBi('profesores')).toEqual({ estado: 'invalida' })
    expect(resolverUrlPowerBi('aseguramiento')).toEqual({ estado: 'no-publicada' })
  })
})

describe('modo y acceso', () => {
  it('usa publico por defecto y embebido solo si se pide', () => {
    vi.stubEnv('POWERBI_MODO', '')
    expect(obtenerModoPowerBi()).toBe('publico')
    vi.stubEnv('POWERBI_MODO', 'embebido')
    expect(obtenerModoPowerBi()).toBe('embebido')
    vi.stubEnv('POWERBI_MODO', 'otro')
    expect(obtenerModoPowerBi()).toBe('publico')
  })

  it('solo Administrador y SuperAdmin ven los informes', () => {
    expect(puedeVerInformesPowerBi('Administrador')).toBe(true)
    expect(puedeVerInformesPowerBi('SuperAdmin')).toBe(true)
    expect(puedeVerInformesPowerBi('Revisor')).toBe(false)
    expect(puedeVerInformesPowerBi('Cargador')).toBe(false)
    expect(puedeVerInformesPowerBi('ParAcademico')).toBe(false)
    expect(puedeVerInformesPowerBi(undefined)).toBe(false)
  })
})
