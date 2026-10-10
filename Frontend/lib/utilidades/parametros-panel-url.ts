import type { EstadoFiltroPanel, FiltrosPanelProgramas } from '@/lib/servicios/panel-programas.servicio'
import type { SemaforoPrograma } from '@/lib/tipos'
import type { TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'

export const RUTA_PANEL_PROGRAMAS = '/administrador/programas'
export const OPCION_TODOS = 'todos'

/** Filtros del panel tal como viven en la URL compartible. */
export interface FiltrosPanelUrl {
  q: string
  estado: EstadoFiltroPanel
  tramite: string
  semaforo: string
  semestre: string
  pagina: number
}

type ParametrosEntrada = URLSearchParams | Record<string, string | string[] | undefined>

function leer(params: ParametrosEntrada, clave: string): string {
  if (params instanceof URLSearchParams) return params.get(clave) ?? ''
  const valor = params[clave]
  return (Array.isArray(valor) ? valor[0] : valor) ?? ''
}

const ESTADOS: EstadoFiltroPanel[] = ['activos', 'inactivos', 'todos']

export function leerFiltrosPanelUrl(params: ParametrosEntrada): FiltrosPanelUrl {
  const estado = leer(params, 'estado') as EstadoFiltroPanel
  const pagina = Number(leer(params, 'pagina'))
  return {
    q: leer(params, 'q').trim(),
    estado: ESTADOS.includes(estado) ? estado : 'activos',
    tramite: leer(params, 'tramite') || OPCION_TODOS,
    semaforo: leer(params, 'semaforo') || OPCION_TODOS,
    semestre: leer(params, 'semestre').trim(),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  }
}

/** URL del navegador: omite los valores por defecto para que el enlace sea corto y estable. */
export function construirUrlPanel(filtros: FiltrosPanelUrl, base = RUTA_PANEL_PROGRAMAS): string {
  const params = new URLSearchParams()
  if (filtros.q.trim()) params.set('q', filtros.q.trim())
  if (filtros.estado !== 'activos') params.set('estado', filtros.estado)
  if (filtros.tramite !== OPCION_TODOS) params.set('tramite', filtros.tramite)
  if (filtros.semaforo !== OPCION_TODOS) params.set('semaforo', filtros.semaforo)
  if (filtros.semestre.trim()) params.set('semestre', filtros.semestre.trim())
  if (filtros.pagina > 1) params.set('pagina', String(filtros.pagina))
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/** Filtros del panel para la API (catálogo API y programas creados en SIAC). */
export function filtrosPanelParaApi(filtros: FiltrosPanelUrl, limite: number): FiltrosPanelProgramas {
  return {
    page: filtros.pagina,
    limit: limite,
    tramite: filtros.tramite === OPCION_TODOS ? undefined : (filtros.tramite as TipoTramiteSIAC),
    semaforo: filtros.semaforo === OPCION_TODOS ? undefined : (filtros.semaforo as SemaforoPrograma),
    semestre: filtros.semestre || undefined,
    estado: filtros.estado,
    q: filtros.q || undefined,
  }
}

/** Fecha de resolución (guardada a medianoche UTC) en formato local sin correrse un día. */
export function formatearFechaResolucion(fechaIso: string | null | undefined): string {
  if (!fechaIso) return 'Sin resolución'
  return new Date(fechaIso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** «n/9» para guías con puntaje (G1/G3); porcentaje para las demás. */
export function etiquetaDocumentoPanel(doc: {
  codigoGuia: string
  puntaje: number | null
  totalCondiciones: number | null
  porcentajeInterno: number
  revisado: boolean
}): string {
  if (doc.puntaje !== null && doc.totalCondiciones) return `${doc.codigoGuia} ${doc.puntaje}/${doc.totalCondiciones}`
  if (!doc.revisado) return `${doc.codigoGuia} sin revisar`
  return `${doc.codigoGuia} ${doc.porcentajeInterno}%`
}
