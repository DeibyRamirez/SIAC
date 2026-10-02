import { peticionApi } from './cliente-api'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import type { SemaforoPrograma } from '@/lib/tipos'
import type { TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'

export interface InstitucionDetalle {
  id: string
  nombre: string
  codigo: string
  tipoTramiteActivo: TipoTramiteSIAC
  fechaResolucion?: string | null
  alcance: 'Institucion'
  porcentajeAvance: number
  semaforo: SemaforoPrograma
  estadoProceso: string
  evidencias: { estado: string }[]
  conteosEstado: {
    borrador: number
    enRevision: number
    conObservaciones: number
    cumple: number
    validado: number
    rechazado: number
  }
}

export async function obtenerInstitucionApi(): Promise<InstitucionDetalle> {
  return peticionApi<InstitucionDetalle>('/institucion')
}

export async function obtenerProgresoInstitucionApi(): Promise<ProgresoProcesoSIAC> {
  return peticionApi<ProgresoProcesoSIAC>('/institucion/progreso')
}

export async function actualizarInstitucionApi(datos: {
  tipoTramiteActivo?: TipoTramiteSIAC
}): Promise<InstitucionDetalle> {
  return peticionApi<InstitucionDetalle>('/institucion', {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })
}

export async function activarVigenciaInstitucionApi(): Promise<InstitucionDetalle> {
  return peticionApi<InstitucionDetalle>('/institucion/activar-vigencia', {
    method: 'POST',
  })
}
