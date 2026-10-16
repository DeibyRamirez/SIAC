import { MensajeCorreo } from './proveedor-correo.port';

const REMITENTE_FALLBACK = 'SIAC <notificaciones@uniautonoma.edu.co>';

/** CORREO_DESDE → CORREO_REMITENTE → SMTP_FROM → fallback */
export function resolverRemitenteCorreo(
  obtener: (clave: string) => string | undefined,
  fallback = REMITENTE_FALLBACK,
): string {
  const desde = obtener('CORREO_DESDE')?.trim();
  if (desde) return desde;
  const remitente = obtener('CORREO_REMITENTE')?.trim();
  if (remitente) return remitente;
  const smtpFrom = obtener('SMTP_FROM')?.trim();
  if (smtpFrom) return smtpFrom;
  return fallback;
}

export interface EnvioResendPreparado {
  destinatario: string;
  asunto: string;
  textoPlano: string;
  textoHtml?: string;
  redirigidoSandbox: boolean;
  destinatarioOriginal?: string;
}

/** Si RESEND_CORREO_SANDBOX está definido, redirige el envío y anota el destinatario real. */
export function prepararEnvioResend(
  mensaje: MensajeCorreo,
  correoSandbox: string | undefined,
): EnvioResendPreparado {
  const sandbox = correoSandbox?.trim().toLowerCase();
  if (!sandbox) {
    return {
      destinatario: mensaje.destinatario,
      asunto: mensaje.asunto,
      textoPlano: mensaje.textoPlano,
      textoHtml: mensaje.textoHtml,
      redirigidoSandbox: false,
    };
  }

  const original = mensaje.destinatario.trim();
  const prefijoAsunto = `[DEV → ${original}] `;
  const nota = `\n\n---\n[SIAC dev] Destinatario original: ${original}`;

  return {
    destinatario: sandbox,
    asunto: `${prefijoAsunto}${mensaje.asunto}`,
    textoPlano: `${mensaje.textoPlano}${nota}`,
    textoHtml: mensaje.textoHtml
      ? `${mensaje.textoHtml}<hr/><p><small>[SIAC dev] Destinatario original: ${original}</small></p>`
      : undefined,
    redirigidoSandbox: true,
    destinatarioOriginal: original,
  };
}
