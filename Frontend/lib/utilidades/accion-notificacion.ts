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
    case 'aprobacion':
    case 'observaciones':
    case 'rechazo': {
      const evidenciaId = idValido(meta.evidenciaId)
      if (!evidenciaId || rol !== 'Cargador') return null
      return { href: `/cargador/evidencias/${evidenciaId}`, etiqueta: 'Ver mi evidencia' }
    }
    case 'avance': {
      if (rol === 'ParAcademico') {
        return { href: '/administrador/dashboard', etiqueta: 'Ver métricas' }
      }
      if (rol === 'Administrador' || rol === 'SuperAdmin') {
        const programaId = idValido(meta.programaId)
        if (!programaId) return null
        return { href: `/administrador/programas/${programaId}`, etiqueta: 'Ver programa' }
      }
      return null
    }
    case 'vigencia':
      if (rol === 'Administrador' || rol === 'SuperAdmin') {
        return { href: '/administrador/vigencias', etiqueta: 'Ver vigencias' }
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
