import { peticionApi } from './cliente-api'
import type { CodigoDocumentoGuia, TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'

export interface DocumentoProgresoSIAC {
  codigoGuia: CodigoDocumentoGuia
  nombre: string
  peso: number
  porcentajeInterno: number
  aportacion: number
  aceptado: boolean
  rechazado: boolean
}

export interface ProgresoProcesoSIAC {
  programaId: string
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
