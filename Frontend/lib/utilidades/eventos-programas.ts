export const EVENTO_PROGRAMAS_ACTUALIZADOS = 'siac:programas-actualizados'

export function notificarProgramasActualizados(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENTO_PROGRAMAS_ACTUALIZADOS))
}

export function suscribirProgramasActualizados(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENTO_PROGRAMAS_ACTUALIZADOS, listener)
  return () => window.removeEventListener(EVENTO_PROGRAMAS_ACTUALIZADOS, listener)
}
