import {
  escaparAtributoHtml,
  escaparHtml,
  PlantillaCorreo,
  urlFrontend,
} from './comun';

/**
 * Plantilla genérica (compatibilidad HU-006/HU-010): envuelve un mensaje ya redactado con la
 * etiqueta del tipo y el enlace profundo. Las plantillas específicas de T-007.3h viven en
 * `vigencia.ts`, `anexos.ts`, `revision.ts`, `avance.ts` y `dictamen.ts`.
 */
export function etiquetaTipoGenerica(tipo: string): string {
  switch (tipo) {
    case 'vigencia':
    case 'vigencia_amarilla':
    case 'vigencia_roja':
    case 'vigencia_vencida':
    case 'anexo_vence_manana':
      return 'Vigencia';
    case 'dictamen_validado':
    case 'aprobacion':
      return 'Aprobación';
    case 'dictamen_cumple':
      return 'Cumple';
    case 'dictamen_con_observaciones':
    case 'observaciones':
    case 'rechazo':
      return 'Con observaciones';
    case 'revision_pendiente':
      return 'Revisión pendiente';
    case 'avance':
      return 'Avance de programa';
    default:
      return 'Notificación SIAC';
  }
}

function esTipoDictamen(tipo: string): boolean {
  return (
    tipo === 'dictamen_validado' ||
    tipo === 'dictamen_cumple' ||
    tipo === 'dictamen_con_observaciones' ||
    tipo === 'aprobacion' ||
    tipo === 'observaciones' ||
    tipo === 'rechazo'
  );
}

function esTipoVigencia(tipo: string): boolean {
  return (
    tipo === 'vigencia' ||
    tipo === 'vigencia_amarilla' ||
    tipo === 'vigencia_roja' ||
    tipo === 'vigencia_vencida' ||
    tipo === 'anexo_vence_manana'
  );
}

/** Enlace profundo por tipo (misma regla que usaba construirPlantillaCorreoNotificacion). */
export function enlaceTipoGenerico(
  tipo: string,
  metadata?: Record<string, unknown>,
): string | null {
  const evidenciaId = metadata?.evidenciaId;
  if (typeof evidenciaId === 'string' && evidenciaId) {
    if (tipo === 'revision_pendiente') {
      return `${urlFrontend()}/revisor/bandeja/${evidenciaId}`;
    }
    if (esTipoDictamen(tipo)) {
      return `${urlFrontend()}/cargador/evidencias/${evidenciaId}`;
    }
    return `${urlFrontend()}/administrador/busqueda?evidenciaId=${evidenciaId}`;
  }
  const programaId = metadata?.programaId;
  if (typeof programaId === 'string' && programaId && tipo === 'avance') {
    return `${urlFrontend()}/administrador/programas/${programaId}`;
  }
  if (esTipoVigencia(tipo)) {
    const base = `${urlFrontend()}/administrador/vigencias`;
    if (typeof programaId === 'string' && programaId) {
      return `${base}?programaId=${programaId}`;
    }
    return base;
  }
  return null;
}

export function plantillaGenerica(
  tipo: string,
  mensaje: string,
  asuntoCorreo?: string,
  metadata?: Record<string, unknown>,
): PlantillaCorreo {
  const asunto = asuntoCorreo ?? `[SIAC] ${etiquetaTipoGenerica(tipo)}`;
  const etiqueta = escaparHtml(etiquetaTipoGenerica(tipo));
  const cta = enlaceTipoGenerico(tipo, metadata);
  const ctaHtml = cta
    ? `<p style="margin:24px 0 0"><a href="${escaparAtributoHtml(cta)}" style="display:inline-block;padding:10px 18px;background:#0A3B74;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Abrir en SIAC</a></p>`
    : '';
  const ctaPlano = cta ? `\n\nAbrir en SIAC: ${cta}` : '';
  const mensajeHtml = escaparHtml(mensaje).replace(/\n/g, '<br>');

  const html = `
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
        <p style="margin:0">${mensajeHtml}</p>
        ${ctaHtml}
        <p style="margin:28px 0 0;font-size:12px;color:#64748b">Este mensaje se envió porque usted tiene un rol activo en el Sistema Interno de Aseguramiento de la Calidad. También puede ver esta alerta en la campana de notificaciones dentro de SIAC.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return {
    asunto,
    texto: `${mensaje}${ctaPlano}`,
    html,
  };
}
