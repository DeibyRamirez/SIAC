import type { RolUsuario } from '@/lib/tipos'

/**
 * Panel de programas (HU-010): solo Administrador, igual que la API `/programas/panel`.
 * El Par académico está en pausa (decisión del PO, 06/10) y no entra a esta página.
 */
export const ROLES_PANEL_PROGRAMAS: RolUsuario[] = ['Administrador']
