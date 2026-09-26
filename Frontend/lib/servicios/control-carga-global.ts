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

export function obtenerMensajeCarga(metodo: string, ruta: string): string {
  if (ruta.includes('enviar-revision')) return 'Enviando a revisión…'
  if (ruta.includes('/archivo')) return 'Subiendo documento…'
  if (ruta.includes('/dictamen')) return 'Registrando dictamen…'
  return mensajePorMetodo(metodo)
}
