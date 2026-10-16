export function etiquetaTipoNotificacion(tipo?: string): string {
  switch (tipo) {
    case 'vigencia':
    case 'vigencia_amarilla':
    case 'vigencia_roja':
    case 'vigencia_vencida':
    case 'anexo_vence_manana':
      return 'Vigencia'
    case 'dictamen_validado':
    case 'aprobacion':
      return 'Aprobación'
    case 'dictamen_cumple':
      return 'Cumple'
    case 'dictamen_con_observaciones':
    case 'observaciones':
      // El flujo G1-G4 ya no rechaza: comunica «Con observaciones» (decisión del PO, 13/10).
      // El tipo «rechazo» solo existe en alertas legadas y se muestra igual.
    case 'rechazo':
      return 'Con observaciones'
    case 'revision_pendiente':
      return 'Revisión'
    case 'avance':
      return 'Avance'
    default:
      return 'General'
  }
}
