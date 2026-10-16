import type { RolUsuario } from '@/lib/tipos'

/**
 * Roles que ven los informes Power BI (HU-009). Solo Administrador y SuperAdmin:
 * «Publicar en la web» deja el informe público, así que no se amplía a otros roles.
 * El Revisor y el Par académico (en pausa) no entran a `/administrador/dashboard` (decisión del PO, 13/10).
 */
export const ROLES_INFORMES_POWERBI: readonly RolUsuario[] = ['Administrador', 'SuperAdmin']

export function puedeVerInformesPowerBi(rol: RolUsuario | null | undefined): boolean {
  return Boolean(rol && ROLES_INFORMES_POWERBI.includes(rol))
}
