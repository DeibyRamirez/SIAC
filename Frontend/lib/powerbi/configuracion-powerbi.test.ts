import { afterEach, describe, expect, it, vi } from 'vitest'

import { categoriasInformesPowerBi } from '@/lib/informes-powerbi'
import {
  esUrlPublicaPowerBiValida,
  estadoDesdeUrlPublica,
  extraerUrlPublicaPowerBi,
  obtenerModoPowerBi,
} from '@/lib/powerbi/configuracion-powerbi'
import { puedeVerInformesPowerBi } from '@/lib/powerbi/acceso-powerbi'

const URL_EJEMPLO = 'https://app.powerbi.com/view?r=ejemploDePrueba123'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('catálogo de informes Power BI', () => {
  it('tiene las 8 categorías institucionales', () => {
    expect(categoriasInformesPowerBi.map((c) => c.id)).toEqual([
      'aseguramiento',
      'infraestructura',
      'egresados',
      'investigacion',
      'profesores',
      'estudiantes',
      'bienestar',
      'relaciones-entorno',
    ])
  })
})

describe('extraerUrlPublicaPowerBi', () => {
  it('extrae la URL desde un iframe pegado', () => {
    const iframe =
      '<iframe src="https://app.powerbi.com/view?r=tokenEjemplo" width="600"></iframe>'
    expect(extraerUrlPublicaPowerBi(iframe)).toBe(
      'https://app.powerbi.com/view?r=tokenEjemplo',
    )
  })

  it('devuelve null si no hay URL válida', () => {
    expect(extraerUrlPublicaPowerBi('texto sin enlace')).toBeNull()
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

  it('estadoDesdeUrlPublica distingue publicada, no publicada e inválida', () => {
    expect(estadoDesdeUrlPublica(URL_EJEMPLO)).toEqual({ estado: 'publicada', url: URL_EJEMPLO })
    expect(estadoDesdeUrlPublica('https://ejemplo.com/informe')).toEqual({ estado: 'invalida' })
    expect(estadoDesdeUrlPublica('')).toEqual({ estado: 'no-publicada' })
    expect(estadoDesdeUrlPublica(null)).toEqual({ estado: 'no-publicada' })
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
    expect(puedeVerInformesPowerBi(undefined)).toBe(false)
  })
})
