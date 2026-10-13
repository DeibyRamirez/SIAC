import type { RolUsuario } from '@/lib/tipos'

/**
 * Panel de programas (HU-010): solo Administrador, igual que la API `/programas/panel`.
 * El Par académico está en pausa (decisión del PO, 06/10) y no entra a esta página.
 */
export const ROLES_PANEL_PROGRAMAS: RolUsuario[] = ['Administrador']

/**
 * Dashboard de métricas y Power BI (HU-009): solo Administrador (el SuperAdmin entra por su
 * propia regla de rutas). El Par académico está en pausa y el Revisor no tiene acceso.
 */
export const ROLES_DASHBOARD_METRICAS: RolUsuario[] = ['Administrador']
