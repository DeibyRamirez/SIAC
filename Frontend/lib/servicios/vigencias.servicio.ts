import { peticionApi } from '@/lib/servicios/cliente-api'
import type {
  AlcancePaqueteVigencia,
  EstadoDemoVigencia,
  PaqueteVigenciaRegistro,
  VigenciaPrograma,
} from '@/lib/tipos'

export async function listarPaquetesRegistroVigenciaApi(programaId?: string) {
  const query = programaId ? `?programaId=${encodeURIComponent(programaId)}` : ''
  return peticionApi<PaqueteVigenciaRegistro[]>(`/vigencias/paquetes-registro${query}`)
}

/** §0: vigencia de un programa con escala demo si la sesión está activa (polling 5 s en modo prueba). */
export async function obtenerVigenciaProgramaApi(programaId: string) {
  return peticionApi<VigenciaPrograma>(`/programas/${encodeURIComponent(programaId)}/vigencia`)
}

/** Respuesta de POST /vigencias/demo/iniciar: la duración la decide el servidor. */
export interface RespuestaInicioDemoVigencia {
  inicioAtMs: number
  duracionSeg: number
  intervaloSeg: number
}

export async function iniciarDemoVigenciaApi(entidadId: string, alcance: AlcancePaqueteVigencia) {
  return peticionApi<RespuestaInicioDemoVigencia>('/vigencias/demo/iniciar', {
    method: 'POST',
    body: JSON.stringify({ entidadId, alcance }),
  })
}

export async function detenerDemoVigenciaApi(entidadId: string, alcance: AlcancePaqueteVigencia) {
  return peticionApi<{ detenida: boolean }>('/vigencias/demo/detener', {
    method: 'POST',
    body: JSON.stringify({ entidadId, alcance }),
  })
}

export async function obtenerEstadoDemoVigenciaApi(entidadId: string, alcance: AlcancePaqueteVigencia) {
  const params = new URLSearchParams({ entidadId, alcance })
  return peticionApi<EstadoDemoVigencia>(`/vigencias/demo/estado?${params}`)
}
