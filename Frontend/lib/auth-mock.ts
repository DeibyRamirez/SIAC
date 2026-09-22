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
    case 'ParAcademico':
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
    case 'ParAcademico':
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
    case 'ParAcademico':
      return 'Par académico MEN'
    case 'SuperAdmin':
      return 'Super administrador SIAC'
  }
}

const RUTAS_SUPERADMIN = ['/superadmin', '/cargador', '/revisor', '/administrador'] as const

/** Rutas de consulta institucional para Par académico (HU-002): sin carga ni dictamen. */
const RUTAS_PAR_ACADEMICO = [
  '/administrador/dashboard',
  '/administrador/programas',
  '/administrador/evidencias',
] as const

export const ROLES_CONSULTA_INSTITUCIONAL: RolUsuario[] = ['Administrador', 'ParAcademico']

export function rutaPermitidaSuperAdmin(pathname: string): boolean {
  return RUTAS_SUPERADMIN.some(
    (prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`),
  )
}

export function rutaPermitidaParAcademico(pathname: string): boolean {
  if (pathname === '/administrador') return true
  return RUTAS_PAR_ACADEMICO.some(
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
