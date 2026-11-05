import type { RolUsuario } from '@/lib/tipos'

/**
 * Panel de programas (HU-010): solo Administrador, igual que la API `/programas/panel`.
 */
export const ROLES_PANEL_PROGRAMAS: RolUsuario[] = ['Administrador']

/**
 * Dashboard de métricas y Power BI (HU-009): solo Administrador (el SuperAdmin entra por su
 * propia regla de rutas). El Revisor no tiene acceso.
 */
export const ROLES_DASHBOARD_METRICAS: RolUsuario[] = ['Administrador']

/**
 * Usabilidad (28/10/2026): nombre visible del rol en la UI. El rol `Cargador` se muestra como
 * «Profesor»; en BD, enums y API sigue siendo `Cargador`.
 */
export const NOMBRE_VISIBLE_ROL: Record<RolUsuario, string> = {
  Cargador: 'Profesor',
  Revisor: 'Revisor',
  Administrador: 'Administrador',
  SuperAdmin: 'SuperAdmin',
}

export function nombreVisibleRol(rol: RolUsuario): string {
  return NOMBRE_VISIBLE_ROL[rol] ?? rol
}
