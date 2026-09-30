import { peticionApi } from './cliente-api'
import type { SemaforoPrograma } from '@/lib/tipos'
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
  semaforoVigencia: SemaforoPrograma
  semaforoGeneral: SemaforoPrograma
  documentos: DocumentoPanel[]
  anexoInfraestructuraVencido: boolean
}

export interface RespuestaPanelProgramas {
  datos: FilaPanelPrograma[]
  total: number
  page: number
  limit: number
  totalPaginas: number
}

export interface FiltrosPanelProgramas {
  page?: number
  limit?: number
  tramite?: TipoTramiteSIAC
  alcance?: AlcanceTramiteUI
  semaforo?: SemaforoPrograma
  semestre?: string
}

export async function listarPanelProgramasApi(
  filtros: FiltrosPanelProgramas = {},
): Promise<RespuestaPanelProgramas> {
  const params = new URLSearchParams()
  if (filtros.page) params.set('page', String(filtros.page))
  if (filtros.limit) params.set('limit', String(filtros.limit))
  if (filtros.tramite) params.set('tramite', filtros.tramite)
  if (filtros.alcance) params.set('alcance', filtros.alcance)
  if (filtros.semaforo) params.set('semaforo', filtros.semaforo)
  if (filtros.semestre) params.set('semestre', filtros.semestre)
  const query = params.toString()
  return peticionApi<RespuestaPanelProgramas>(`/programas/panel${query ? `?${query}` : ''}`)
}
