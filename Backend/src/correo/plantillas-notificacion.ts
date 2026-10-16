export interface PlantillaCorreoNotificacion {
  asunto: string
  textoPlano: string
  textoHtml: string
}

function etiquetaTipo(tipo: string): string {
  switch (tipo) {
    case 'vigencia':
    case 'vigencia_amarilla':
    case 'vigencia_vencida':
      return 'Vigencia'
    case 'aprobacion':
      return 'Aprobación'
    case 'observaciones':
      return 'Observaciones'
    case 'revision_pendiente':
      return 'Revisión pendiente'
    case 'avance':
      return 'Avance de programa'
    case 'rechazo':
      return 'Rechazo'
    default:
      return 'Notificación SIAC'
  }
}

function enlaceCta(tipo: string, metadata?: Record<string, unknown>): string | null {
  const evidenciaId = metadata?.evidenciaId
  if (typeof evidenciaId === 'string' && evidenciaId) {
    if (tipo === 'revision_pendiente') {
      return `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/revisor/bandeja/${evidenciaId}`
    }
    return `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/administrador/busqueda?evidenciaId=${evidenciaId}`
  }
  const programaId = metadata?.programaId
  if (typeof programaId === 'string' && programaId && tipo === 'avance') {
    return `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/administrador/programas/${programaId}`
  }
  if (
    tipo === 'vigencia' ||
    tipo === 'vigencia_amarilla' ||
    tipo === 'vigencia_vencida'
  ) {
    const base = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/administrador/vigencias`
    if (typeof programaId === 'string' && programaId) {
      return `${base}?programaId=${programaId}`
    }
    return base
  }
  return null
}

export function construirPlantillaCorreoNotificacion(
  tipo: string,
  mensaje: string,
  asuntoCorreo?: string,
  metadata?: Record<string, unknown>,
): PlantillaCorreoNotificacion {
  const asunto = asuntoCorreo ?? `[SIAC] ${etiquetaTipo(tipo)}`
  const etiqueta = etiquetaTipo(tipo)
  const cta = enlaceCta(tipo, metadata)
  const ctaHtml = cta
    ? `<p style="margin:24px 0 0"><a href="${cta}" style="display:inline-block;padding:10px 18px;background:#0A3B74;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Abrir en SIAC</a></p>`
    : ''
  const ctaPlano = cta ? `\n\nAbrir en SIAC: ${cta}` : ''

  const textoHtml = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A3B74">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
    <tr>
      <td style="padding:24px 28px 8px">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1CBCA6">SIAC · CUAC</p>
        <h1 style="margin:12px 0 0;font-size:20px;font-weight:700">Notificación del sistema</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 0">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#0A3B74;color:#fff;font-size:11px;font-weight:600">${etiqueta}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 28px;font-size:15px;line-height:1.55;color:#334155">
        <p style="margin:0">${mensaje}</p>
        ${ctaHtml}
        <p style="margin:28px 0 0;font-size:12px;color:#64748b">Este mensaje se envió porque usted tiene un rol activo en el Sistema Interno de Aseguramiento de la Calidad. También puede ver esta alerta en la campana de notificaciones dentro de SIAC.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  return {
    asunto,
    textoPlano: `${mensaje}${ctaPlano}`,
    textoHtml,
  }
}
