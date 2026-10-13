export function etiquetaTipoNotificacion(tipo?: string): string {
  switch (tipo) {
    case 'vigencia':
      return 'Vigencia'
    case 'aprobacion':
      return 'Aprobación'
    case 'observaciones':
      return 'Observaciones'
    case 'revision_pendiente':
      return 'Revisión'
    case 'avance':
      return 'Avance'
    case 'rechazo':
      return 'Rechazo'
    default:
      return 'General'
  }
}
