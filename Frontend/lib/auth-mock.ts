import { DOMINIO_INSTITUCIONAL, usuariosSemilla } from '@/lib/datos-semilla'
import type { RolUsuario, SesionUsuario, Usuario } from '@/lib/tipos'

export const CLAVE_SESION = 'siac-sesion-prototipo'

export function esCorreoInstitucional(correo: string): boolean {
  return correo.trim().toLowerCase().endsWith(`@${DOMINIO_INSTITUCIONAL}`)
}

export function autenticarUsuario(
  correo: string,
  contrasena: string,
): Usuario | null {
  const correoNormalizado = correo.trim().toLowerCase()

  if (!esCorreoInstitucional(correoNormalizado)) {
    return null
  }

  return (
    usuariosSemilla.find(
      (usuario) =>
        usuario.correo.toLowerCase() === correoNormalizado &&
        usuario.contrasena === contrasena,
    ) ?? null
  )
}

export function crearSesion(usuario: Usuario): SesionUsuario {
  return {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
  }
}

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
      return 'Cargador de evidencias'
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
