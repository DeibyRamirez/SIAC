const URL_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

function obtenerToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('siac-token-jwt')
}

export async function obtenerContenidoEvidenciaApi(
  id: string,
  version?: number,
): Promise<ArrayBuffer> {
  const token = obtenerToken()
  const query = version !== undefined ? `?version=${version}` : ''
  const respuesta = await fetch(`${URL_BASE}/evidencias/${id}/contenido${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!respuesta.ok) {
    throw new Error('No se pudo obtener el contenido del documento.')
  }
  return respuesta.arrayBuffer()
}

export async function obtenerContenidoPlantillaApi(id: string): Promise<ArrayBuffer> {
  const token = obtenerToken()
  const respuesta = await fetch(`${URL_BASE}/plantillas/${id}/contenido`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!respuesta.ok) {
    throw new Error('No se pudo obtener el contenido de la plantilla.')
  }
  return respuesta.arrayBuffer()
}
