const URL_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export const MIME_DOCX_OFICIAL =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function obtenerToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('siac-token-jwt')
}

function validarBufferDocx(buffer: ArrayBuffer, origen: string): ArrayBuffer {
  if (buffer.byteLength < 4) {
    throw new Error(`La respuesta de ${origen} está vacía o incompleta.`)
  }
  const cabecera = new Uint8Array(buffer, 0, 2)
  if (cabecera[0] !== 0x50 || cabecera[1] !== 0x4b) {
    throw new Error(
      `La respuesta de ${origen} no es un archivo .docx válido (ZIP OOXML).`,
    )
  }
  return buffer
}

async function leerCuerpoBinario(
  respuesta: Response,
  origen: string,
): Promise<ArrayBuffer> {
  const tipo =
    respuesta.headers.get('content-type')?.split(';')[0]?.trim() ?? ''

  if (
    tipo &&
    tipo !== MIME_DOCX_OFICIAL &&
    tipo !== 'application/octet-stream'
  ) {
    throw new Error(
      `Tipo de contenido inesperado (${tipo}). Se esperaba ${MIME_DOCX_OFICIAL}.`,
    )
  }

  const buffer = await respuesta.arrayBuffer()
  return validarBufferDocx(buffer, origen)
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
  return leerCuerpoBinario(respuesta, 'evidencias/contenido')
}

export async function obtenerContenidoPlantillaApi(id: string): Promise<ArrayBuffer> {
  const token = obtenerToken()
  const respuesta = await fetch(`${URL_BASE}/plantillas/${id}/contenido`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!respuesta.ok) {
    throw new Error('No se pudo obtener el contenido de la plantilla.')
  }
  return leerCuerpoBinario(respuesta, 'plantillas/contenido')
}

/** Descarga directa como Blob con MIME oficial (visor o guardar en disco). */
export async function obtenerBlobDocxEvidenciaApi(
  id: string,
  version?: number,
): Promise<Blob> {
  const buffer = await obtenerContenidoEvidenciaApi(id, version)
  return new Blob([buffer], { type: MIME_DOCX_OFICIAL })
}
