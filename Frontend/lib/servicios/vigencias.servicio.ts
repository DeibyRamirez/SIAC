import { peticionApi } from '@/lib/servicios/cliente-api'
import type { AlcancePaqueteVigencia, EstadoDemoVigencia, PaqueteVigenciaRegistro } from '@/lib/tipos'

export async function listarPaquetesRegistroVigenciaApi(programaId?: string) {
  const query = programaId ? `?programaId=${encodeURIComponent(programaId)}` : ''
  return peticionApi<PaqueteVigenciaRegistro[]>(`/vigencias/paquetes-registro${query}`)
}

export async function iniciarDemoVigenciaApi(entidadId: string, alcance: AlcancePaqueteVigencia) {
  return peticionApi<{ inicioAtMs: number }>('/vigencias/demo/iniciar', {
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
