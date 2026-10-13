import type { RolUsuario } from '@/lib/tipos'

/**
 * Roles que ven los informes Power BI (HU-009). Solo Administrador y SuperAdmin:
 * «Publicar en la web» deja el informe público, así que no se amplía a otros roles.
 * El Revisor no tiene acceso a `/administrador/dashboard` (pendiente de confirmar con el PO).
 */
export const ROLES_INFORMES_POWERBI: readonly RolUsuario[] = ['Administrador', 'SuperAdmin']

export function puedeVerInformesPowerBi(rol: RolUsuario | null | undefined): boolean {
  return Boolean(rol && ROLES_INFORMES_POWERBI.includes(rol))
}
