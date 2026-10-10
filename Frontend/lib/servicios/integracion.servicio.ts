import { peticionApi } from './cliente-api'

export interface RespuestaSincronizarCarreras {
  importados: number
  actualizados: number
  desactivados: number
  total: number
  totalEnBd: number
  origen: string
}

export async function sincronizarCarrerasApi(): Promise<RespuestaSincronizarCarreras> {
  return peticionApi<RespuestaSincronizarCarreras>('/integracion/sincronizar-carreras', {
    method: 'POST',
  })
}

export interface BucketStorageEstado {
  tipo: 'evidencias' | 'plantillas' | 'documentos'
  bucket: string
  existe: boolean
  error?: string
}

export interface EstadoStorageApi {
  modo: string
  bucketEvidencias: string
  bucketPlantillas: string
  bucketDocumentos: string
  endpoint: string
  buckets: BucketStorageEstado[]
}

export async function obtenerEstadoStorageApi(): Promise<EstadoStorageApi> {
  return peticionApi<EstadoStorageApi>('/integracion/estado-storage')
}
