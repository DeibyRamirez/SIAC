import { describe, expect, it } from 'vitest'

import {
  construirUrlPanel,
  etiquetaDocumentoPanel,
  filtrosPanelParaApi,
  formatearFechaResolucion,
  leerFiltrosPanelUrl,
} from './parametros-panel-url'

describe('parametros-panel-url (R-010.3a)', () => {
  it('lee la URL con valores por defecto y la reconstruye igual (enlace estable)', () => {
    const filtros = leerFiltrosPanelUrl({ q: ' derecho ', semaforo: 'Rojo', pagina: '2' })
    expect(filtros).toEqual({
      q: 'derecho',
      estado: 'activos',
      tramite: 'todos',
      semaforo: 'Rojo',
      semestre: '',
      pagina: 2,
    })
    expect(construirUrlPanel(filtros)).toBe('/administrador/programas?q=derecho&semaforo=Rojo&pagina=2')
    expect(construirUrlPanel(leerFiltrosPanelUrl({}))).toBe('/administrador/programas')
  })

  it('ignora valores inválidos de estado y página', () => {
    const filtros = leerFiltrosPanelUrl(new URLSearchParams('estado=raro&pagina=-3'))
    expect(filtros.estado).toBe('activos')
    expect(filtros.pagina).toBe(1)
  })

  it('traduce a filtros de la API con la búsqueda en el servidor', () => {
    const api = filtrosPanelParaApi(leerFiltrosPanelUrl({ q: 'med', tramite: 'RegistroCalificadoNuevo' }), 12)
    expect(api).toMatchObject({ q: 'med', tramite: 'RegistroCalificadoNuevo', limit: 12, page: 1, semaforo: undefined })
  })

  it('muestra «n/9» para G1, porcentaje para guías sin puntaje y «sin revisar»', () => {
    const base = { porcentajeInterno: 0, revisado: false, puntaje: null, totalCondiciones: null }
    expect(etiquetaDocumentoPanel({ ...base, codigoGuia: 'G1', puntaje: 8, totalCondiciones: 9, revisado: true })).toBe('G1 8/9')
    expect(etiquetaDocumentoPanel({ ...base, codigoGuia: 'G3', puntaje: 5, totalCondiciones: 6, revisado: true })).toBe('G3 5/6')
    expect(etiquetaDocumentoPanel({ ...base, codigoGuia: 'G2', porcentajeInterno: 100, revisado: true })).toBe('G2 100%')
    expect(etiquetaDocumentoPanel({ ...base, codigoGuia: 'G2' })).toBe('G2 sin revisar')
  })

  it('formatea la fecha de resolución sin correrla un día y sin fecha dice «Sin resolución»', () => {
    expect(formatearFechaResolucion('2020-03-01T00:00:00.000Z')).toMatch(/01.*2020/)
    expect(formatearFechaResolucion(null)).toBe('Sin resolución')
  })
})

describe('acceso del Par académico (pausado)', () => {
  it('ya no puede entrar al panel de programas, pero conserva búsqueda y dashboard', async () => {
    const { rutaPermitidaParAcademico } = await import('@/lib/auth-mock')
    const { ROLES_PANEL_PROGRAMAS } = await import('@/lib/constantes/roles')
    expect(rutaPermitidaParAcademico('/administrador/programas')).toBe(false)
    expect(rutaPermitidaParAcademico('/administrador/programas/p1')).toBe(false)
    expect(rutaPermitidaParAcademico('/administrador/busqueda')).toBe(true)
    expect(ROLES_PANEL_PROGRAMAS).toEqual(['Administrador'])
  })
})
