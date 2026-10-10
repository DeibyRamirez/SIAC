import { peticionApi } from './cliente-api'
import type { SemaforoPrograma, SemaforoVigencia } from '@/lib/tipos'
import type {
  AlcanceTramiteUI,
  CodigoDocumentoGuia,
  TipoTramiteSIAC,
} from '@/lib/utilidades/catalogo-tramites-siac'

export interface DocumentoPanel {
  codigoGuia: CodigoDocumentoGuia
  nombre: string
  puntaje: number | null
  totalCondiciones: number | null
  porcentajeInterno: number
  peso: number
  aportacion: number
  revisado: boolean
}

export interface FilaPanelPrograma {
  id: string
  nombre: string
  codigo?: string
  alcance: AlcanceTramiteUI
  tipoTramite: TipoTramiteSIAC
  avancePorcentual: number
  semaforoAvance: SemaforoPrograma
  semaforoVigencia: SemaforoVigencia
  semaforoGeneral: SemaforoPrograma
  documentos: DocumentoPanel[]
  anexoInfraestructuraVencido: boolean
  /** Fecha de la resolución MEN (ISO) o null. */
  fechaResolucion: string | null
  /** Fin de vigencia (resolución + 7 años, configurable) o null. */
  fechaFinVigencia: string | null
  /** Periodo de la evidencia revisada más reciente. */
  semestre: string | null
  activo?: boolean
  urlImagen?: string | null
}

export interface RespuestaPanelProgramas {
  datos: FilaPanelPrograma[]
  total: number
  page: number
  limit: number
  totalPaginas: number
}

export type EstadoFiltroPanel = 'activos' | 'inactivos' | 'todos'

export type OrigenProgramaPanel = 'API' | 'Manual' | 'CSV'

export interface FiltrosPanelProgramas {
  page?: number
  limit?: number
  tramite?: TipoTramiteSIAC
  alcance?: AlcanceTramiteUI
  semaforo?: SemaforoPrograma
  semestre?: string
  estado?: EstadoFiltroPanel
  origen?: OrigenProgramaPanel
  /** Búsqueda por nombre o código (en el servidor). */
  q?: string
}

/** Ruta de la API del panel; la usan el cliente y el SSR (R-010.3a). */
export function rutaPanelProgramas(filtros: FiltrosPanelProgramas = {}): string {
  const params = new URLSearchParams()
  if (filtros.page) params.set('page', String(filtros.page))
  if (filtros.limit) params.set('limit', String(filtros.limit))
  if (filtros.tramite) params.set('tramite', filtros.tramite)
  if (filtros.alcance) params.set('alcance', filtros.alcance)
  if (filtros.semaforo) params.set('semaforo', filtros.semaforo)
  if (filtros.semestre) params.set('semestre', filtros.semestre)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.origen) params.set('origen', filtros.origen)
  if (filtros.q?.trim()) params.set('q', filtros.q.trim())
  const query = params.toString()
  return `/programas/panel${query ? `?${query}` : ''}`
}

export async function listarPanelProgramasApi(
  filtros: FiltrosPanelProgramas = {},
): Promise<RespuestaPanelProgramas> {
  return peticionApi<RespuestaPanelProgramas>(rutaPanelProgramas(filtros))
}
