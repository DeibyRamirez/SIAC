/** Ruta pública del PDF de demostración para el visualizador de plantillas. */
export const URL_DOCUMENTO_DEMO_SIAC = '/SIAC_Documentacion_Proyecto.pdf'

export function esUrlPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url.trim())
}

export function resolverUrlDocumento(urlDocumento?: string): string {
  const url = urlDocumento?.trim()
  return url || URL_DOCUMENTO_DEMO_SIAC
}
