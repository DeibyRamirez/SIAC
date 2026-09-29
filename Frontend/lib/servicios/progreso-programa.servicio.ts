import { peticionApi } from './cliente-api'
import type { CodigoDocumentoGuia, TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'
import type { EstadoEvidencia } from '@/lib/tipos'

export interface DocumentoProgresoSIAC {
  codigoGuia: CodigoDocumentoGuia
  nombre: string
  peso: number
  porcentajeInterno: number
  aportacion: number
  estado?: EstadoEvidencia | null
  /** Puntaje entero n de la última verificación (G1 n/9, G3 n/6). */
  puntaje?: number | null
  totalCondiciones?: number | null
  /** Cumple o Validado. */
  aceptado: boolean
  /** Checklist con condiciones pendientes (n < total). */
  conObservaciones?: boolean
  /** Solo por decisión explícita del Revisor. */
  rechazado: boolean
}

export interface ProgresoProcesoSIAC {
  /** Trámite de programa (G1/G2). */
  programaId?: string
  /** Trámite institucional (G3/G4, HU-010). */
  institucionId?: string
  tipoTramite: TipoTramiteSIAC
  avanceGlobal: number
  documentosAceptados: number
  documentosTotal: number
  documentos: DocumentoProgresoSIAC[]
}

export async function obtenerProgresoProgramaApi(
  programaId: string,
): Promise<ProgresoProcesoSIAC> {
  return peticionApi<ProgresoProcesoSIAC>(`/programas/${programaId}/progreso`)
}
