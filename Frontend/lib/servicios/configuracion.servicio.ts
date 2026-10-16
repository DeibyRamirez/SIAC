import { peticionApi } from './cliente-api'

export interface UmbralesVigencia {
  aniosVigencia: number
  mesesAvisoVigencia: number
  mesesRojoVigencia: number
}

/** T-007.3a: umbrales del semáforo de vigencia (SuperAdmin/Administrador). */
export async function obtenerUmbralesVigenciaApi(): Promise<UmbralesVigencia> {
  return peticionApi<UmbralesVigencia>('/configuracion/vigencia')
}

export async function actualizarUmbralesVigenciaApi(datos: {
  mesesAvisoVigencia: number
  mesesRojoVigencia: number
}): Promise<UmbralesVigencia> {
  return peticionApi<UmbralesVigencia>('/configuracion/vigencia', {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })
}
