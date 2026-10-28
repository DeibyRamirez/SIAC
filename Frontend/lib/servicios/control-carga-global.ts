export interface EstadoCargaGlobal {
  visible: boolean
  mensaje: string
  progreso: number
}

interface ControlCargaGlobal {
  iniciarCarga: (mensaje?: string) => void
  finalizarCarga: () => void
}

let control: ControlCargaGlobal | null = null

export function registrarControlCargaGlobal(
  siguiente: ControlCargaGlobal | null,
): void {
  control = siguiente
}

export function notificarInicioCarga(mensaje: string): void {
  control?.iniciarCarga(mensaje)
}

export function notificarFinCarga(): void {
  control?.finalizarCarga()
}

function mensajePorMetodo(metodo: string): string {
  switch (metodo) {
    case 'POST':
      return 'Guardando…'
    case 'PATCH':
      return 'Actualizando…'
    case 'DELETE':
      return 'Eliminando…'
    default:
      return 'Procesando…'
  }
}

export function debeMostrarCargaGlobal(metodo: string, ruta: string): boolean {
  if (metodo === 'GET') return false
  if (ruta.includes('/auth/login')) return false
  return true
}

/**
 * Mensaje real de la fase según la operación (no siempre «Guardando…»). Con archivo adjunto
 * (FormData) la fase es la subida; las rutas conocidas dicen qué hace el servidor.
 */
export function obtenerMensajeCarga(metodo: string, ruta: string, cuerpo?: unknown): string {
  const conArchivo = typeof FormData !== 'undefined' && cuerpo instanceof FormData
  if (ruta.includes('/reemplazo-documento')) return 'Subiendo archivo y guardando la versión nueva…'
  if (ruta.includes('enviar-revision')) return 'Enviando a revisión y notificando al revisor…'
  if (ruta.includes('/dictamen')) return 'Validando el dictamen y notificando…'
  if (ruta.includes('/vigencias/demo/iniciar')) return 'Iniciando la prueba de vigencia…'
  if (ruta.includes('/vigencias/demo/detener')) return 'Deteniendo la prueba de vigencia…'
  if (ruta.includes('/ejecutar-cron')) return 'Evaluando vigencias y notificando…'
  if (ruta.includes('/notificaciones') || ruta.includes('/alertas')) return 'Actualizando notificaciones…'
  if (conArchivo || ruta.includes('/archivo')) return 'Subiendo archivo…'
  return mensajePorMetodo(metodo)
}
