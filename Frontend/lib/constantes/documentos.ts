/** Tamaño máximo de una evidencia .docx (debe coincidir con el backend). */
export const TAMANO_MAXIMO_EVIDENCIA_MB = 20

export const TAMANO_MAXIMO_EVIDENCIA_BYTES = TAMANO_MAXIMO_EVIDENCIA_MB * 1024 * 1024

/** Mensaje en español si el archivo supera el máximo; null si es válido. */
export function validarTamanoEvidencia(tamanoBytes: number): string | null {
  if (tamanoBytes > TAMANO_MAXIMO_EVIDENCIA_BYTES) {
    return `El archivo supera el tamaño máximo permitido (${TAMANO_MAXIMO_EVIDENCIA_MB} MB).`
  }
  return null
}

export function esUrlPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url.trim())
}
