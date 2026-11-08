import type { RolUsuario, SesionUsuario } from '@/lib/tipos'

export const CLAVE_SESION = 'siac-sesion-prototipo'

export function rutaInicioPorRol(rol: RolUsuario): string {
  switch (rol) {
    case 'Cargador':
      return '/cargador'
    case 'Revisor':
      return '/revisor'
    case 'Administrador':
      return '/administrador'
    case 'SuperAdmin':
      return '/superadmin'
  }
}

export function prefijoRol(rol: RolUsuario): string {
  switch (rol) {
    case 'Cargador':
      return '/cargador'
    case 'Revisor':
      return '/revisor'
    case 'Administrador':
      return '/administrador'
    case 'SuperAdmin':
      return '/superadmin'
  }
}

export function etiquetaRol(rol: RolUsuario): string {
  switch (rol) {
    case 'Cargador':
      return 'Profesor'
    case 'Revisor':
      return 'Revisora de calidad'
    case 'Administrador':
      return 'Administrador'
    case 'SuperAdmin':
      return 'Super administrador SIAC'
  }
}

const RUTAS_SUPERADMIN = ['/superadmin', '/cargador', '/revisor', '/administrador'] as const

/** Roles con consulta institucional (resumen, búsqueda, bandeja y detalle): solo Administrador. */
export const ROLES_CONSULTA_INSTITUCIONAL: RolUsuario[] = ['Administrador']
export { ROLES_PANEL_PROGRAMAS } from '@/lib/constantes/roles'

export function rutaPermitidaSuperAdmin(pathname: string): boolean {
  return RUTAS_SUPERADMIN.some(
    (prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`),
  )
}

export function leerSesionLocal(): SesionUsuario | null {
  if (typeof window === 'undefined') {
    return null
  }

  const crudo = sessionStorage.getItem(CLAVE_SESION)
  if (!crudo) {
    return null
  }

  try {
    return JSON.parse(crudo) as SesionUsuario
  } catch {
    return null
  }
}

export function guardarSesionLocal(sesion: SesionUsuario): void {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
}

export function cerrarSesionLocal(): void {
  sessionStorage.removeItem(CLAVE_SESION)
}
