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
