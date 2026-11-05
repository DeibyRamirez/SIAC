import type { MetadataNotificacion, RolUsuario } from '@/lib/tipos'

export interface AccionNotificacion {
  href: string
  etiqueta: string
}

function idValido(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor.trim() : null
}

export function resolverAccionNotificacion(
  tipo: string | undefined,
  metadata: MetadataNotificacion | null | undefined,
  rol: RolUsuario,
): AccionNotificacion | null {
  const meta = metadata ?? {}

  switch (tipo) {
    case 'revision_pendiente': {
      const evidenciaId = idValido(meta.evidenciaId)
      if (!evidenciaId || rol !== 'Revisor') return null
      return { href: `/revisor/bandeja/${evidenciaId}`, etiqueta: 'Revisar evidencia' }
    }
    case 'dictamen_validado':
    case 'dictamen_cumple':
    case 'dictamen_con_observaciones':
    case 'aprobacion':
    case 'observaciones':
    case 'rechazo': {
      const evidenciaId = idValido(meta.evidenciaId)
      if (!evidenciaId || rol !== 'Cargador') return null
      return { href: `/cargador/evidencias/${evidenciaId}`, etiqueta: 'Ver mi evidencia' }
    }
    case 'avance': {
      if (rol === 'Administrador' || rol === 'SuperAdmin') {
        const programaId = idValido(meta.programaId)
        if (!programaId) return null
        return { href: `/administrador/programas/${programaId}`, etiqueta: 'Ver programa' }
      }
      return null
    }
    case 'vigencia':
    case 'vigencia_amarilla':
    case 'vigencia_roja':
    case 'vigencia_vencida':
    case 'anexo_vence_manana':
      // Fix J (27/10): el Revisor no entra a /administrador/*; va a su resumen. El alcance
      // institucional abre el proceso institucional con su institucionId.
      if (rol === 'Revisor') return { href: '/revisor', etiqueta: 'Abrir resumen' }
      if (rol === 'Administrador' || rol === 'SuperAdmin') {
        const institucionId = idValido(meta.institucionId)
        if (institucionId) {
          return {
            href: `/administrador/programas/institucion?institucionId=${encodeURIComponent(institucionId)}`,
            etiqueta: 'Ver proceso institucional',
          }
        }
        const programaId = idValido(meta.programaId)
        return {
          href: programaId
            ? `/administrador/vigencias?programaId=${encodeURIComponent(programaId)}`
            : '/administrador/vigencias',
          etiqueta: 'Ver vigencias',
        }
      }
      return null
    default:
      return null
  }
}

export function textoBadgeNotificaciones(cantidad: number): string {
  if (cantidad <= 0) return 'Sin alertas pendientes'
  if (cantidad === 1) return '1 alerta pendiente'
  if (cantidad > 99) return 'Más de 99 alertas pendientes'
  return `${cantidad} alertas pendientes`
}

export function contadorBadgeNotificaciones(cantidad: number): string | null {
  if (cantidad <= 0) return null
  return cantidad > 99 ? '99+' : String(cantidad)
}
