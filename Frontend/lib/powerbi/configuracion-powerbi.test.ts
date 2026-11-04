import { afterEach, describe, expect, it, vi } from 'vitest'

import { categoriasInformesPowerBi } from '@/lib/informes-powerbi'
import {
  AVISO_ENLACE_PUBLICO_POWERBI,
  AVISO_ENLACE_SEGURO_POWERBI,
  clasificarUrlInformePowerBi,
  esUrlPublicaPowerBiValida,
  estadoDesdeUrlPublica,
  extraerUrlPublicaPowerBi,
  obtenerModoPowerBi,
} from '@/lib/powerbi/configuracion-powerbi'
import { puedeVerInformesPowerBi } from '@/lib/powerbi/acceso-powerbi'

const URL_EJEMPLO = 'https://app.powerbi.com/view?r=ejemploDePrueba123'
const REPORT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const CTID = '0f1e2d3c-4b5a-6978-8a7b-6c5d4e3f2a1b'
const GROUP = '12345678-1234-1234-1234-123456789abc'
const URL_SEGURA = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&autoAuth=true&ctid=${CTID}`
const URL_SEGURA_GRUPO = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&groupId=${GROUP}`

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

  it('extrae reportEmbed con entidades &amp; del iframe', () => {
    const src = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&amp;autoAuth=true&amp;ctid=${CTID}`
    const iframe = `<iframe src="${src}" width="800" height="600"></iframe>`
    expect(extraerUrlPublicaPowerBi(iframe)).toBe(URL_SEGURA)
  })

  it('devuelve null si no hay URL válida', () => {
    expect(extraerUrlPublicaPowerBi('texto sin enlace')).toBeNull()
    expect(extraerUrlPublicaPowerBi(`https://evil.com/?u=${URL_EJEMPLO}`)).toBeNull()
  })
})

describe('validación de URL pública', () => {
  it('acepta una URL de «Publicar en la web»', () => {
    expect(esUrlPublicaPowerBiValida(URL_EJEMPLO)).toBe(true)
    expect(clasificarUrlInformePowerBi(URL_EJEMPLO)).toBe('publico')
  })

  it('acepta reportEmbed con y sin groupId y sin autoAuth', () => {
    expect(esUrlPublicaPowerBiValida(URL_SEGURA)).toBe(true)
    expect(clasificarUrlInformePowerBi(URL_SEGURA)).toBe('seguro')
    expect(esUrlPublicaPowerBiValida(URL_SEGURA_GRUPO)).toBe(true)
    expect(
      esUrlPublicaPowerBiValida(
        `https://app.powerbi.com/reportEmbed?ctid=${CTID}&reportId=${REPORT.toUpperCase()}`,
      ),
    ).toBe(true)
  })

  it.each([
    '',
    'http://app.powerbi.com/view?r=abc',
    'https://app.powerbi.com/reportEmbed?reportId=abc',
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=no-es-guid`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&autoAuth=false`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&autoAuth=TRUE`,
    `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&ctid=${CTID}&groupId=no`,
    `${URL_SEGURA}&filter=Tabla`,
    'https://app.powerbi.com.malicioso.co/view?r=abc',
    'https://evil.com/?u=https://app.powerbi.com/view?r=abc',
    'https://user:pass@app.powerbi.com/view?r=abc',
    'https://app.powerbi.com@evil.com/view?r=abc',
    'https://app.powerbi.com:443/view?r=abc',
    'https://app.powerbi.com:8443/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'https://app.powerbi.com/view?r=',
    'https://app.powerbi.com/view?r=abc&otro=1',
    'https://app.powerbi.com/view?r=abc#x',
    'https://app.powerbi.com/view/../view?r=abc',
    'javascript:alert(1)',
    'data:text/html,x',
    '//app.powerbi.com/view?r=abc',
  ])('rechaza %s', (url) => {
    expect(esUrlPublicaPowerBiValida(url)).toBe(false)
    expect(clasificarUrlInformePowerBi(url)).toBeNull()
  })

  it('estadoDesdeUrlPublica distingue publicada, no publicada e inválida', () => {
    expect(estadoDesdeUrlPublica(URL_EJEMPLO)).toEqual({
      estado: 'publicada',
      url: URL_EJEMPLO,
      tipo: 'publico',
    })
    expect(estadoDesdeUrlPublica(URL_SEGURA)).toEqual({
      estado: 'publicada',
      url: URL_SEGURA,
      tipo: 'seguro',
    })
    expect(estadoDesdeUrlPublica('https://ejemplo.com/informe')).toEqual({ estado: 'invalida' })
    expect(estadoDesdeUrlPublica('')).toEqual({ estado: 'no-publicada' })
    expect(estadoDesdeUrlPublica(null)).toEqual({ estado: 'no-publicada' })
  })

  it('los avisos de cada tipo quedan fijos', () => {
    expect(AVISO_ENLACE_PUBLICO_POWERBI).toMatch(/sin autenticación/)
    expect(AVISO_ENLACE_SEGURO_POWERBI).toBe(
      'Requiere que el usuario inicie sesión en Microsoft, tenga licencia Power BI Pro y acceso al área de trabajo SIAC',
    )
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
