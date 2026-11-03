import { peticionApi } from './cliente-api'

export interface IntegradorApi {
  id: string
  nombre: string
  activo: boolean
  ultimoUsoEn: string | null
  revocadoEn: string | null
  createdAt: string
  updatedAt: string
}

export interface IntegradorCreadoApi extends IntegradorApi {
  clave: string
}

export function listarIntegradoresApi(): Promise<IntegradorApi[]> {
  return peticionApi<IntegradorApi[]>('/integracion/claves')
}

export function crearIntegradorApi(nombre: string): Promise<IntegradorCreadoApi> {
  return peticionApi<IntegradorCreadoApi>('/integracion/claves', {
    method: 'POST',
    body: JSON.stringify({ nombre }),
  })
}

export function revocarIntegradorApi(id: string): Promise<IntegradorApi> {
  return peticionApi<IntegradorApi>(`/integracion/claves/${id}/revocar`, {
    method: 'POST',
  })
}
