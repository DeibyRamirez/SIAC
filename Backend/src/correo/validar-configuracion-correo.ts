import type { CanalCorreo } from './resolver-canal-correo';

export interface VariablesConfiguracionCorreo {
  smtpHost?: string;
  resendApiKey?: string;
  correoDesde?: string;
  correoRemitente?: string;
  smtpFrom?: string;
}

/**
 * El remitente puede venir por CORREO_DESDE o, como respaldo, por CORREO_REMITENTE / SMTP_FROM
 * (misma prioridad que `resolverRemitenteCorreo` en resolver-envio-resend.ts).
 */
function tieneRemitente(variables: VariablesConfiguracionCorreo): boolean {
  return Boolean(
    variables.correoDesde?.trim() ||
      variables.correoRemitente?.trim() ||
      variables.smtpFrom?.trim(),
  );
}

/**
 * T-007.3f: valida al arrancar el canal de correo.
 * - `smtp` exige SMTP_HOST y remitente (CORREO_DESDE, CORREO_REMITENTE o SMTP_FROM).
 * - `resend` exige RESEND_API_KEY y remitente (CORREO_DESDE, CORREO_REMITENTE o SMTP_FROM).
 * - `ninguno` no exige nada.
 * Lanza un Error (el backend no arranca) con las variables faltantes.
 */
export function validarConfiguracionCorreo(
  canal: CanalCorreo,
  variables: VariablesConfiguracionCorreo,
): void {
  const faltantes: string[] = [];
  if (canal === 'smtp') {
    if (!variables.smtpHost?.trim()) faltantes.push('SMTP_HOST');
    if (!tieneRemitente(variables)) {
      faltantes.push('CORREO_DESDE (o CORREO_REMITENTE/SMTP_FROM)');
    }
  } else if (canal === 'resend') {
    if (!variables.resendApiKey?.trim()) faltantes.push('RESEND_API_KEY');
    if (!tieneRemitente(variables)) {
      faltantes.push('CORREO_DESDE (o CORREO_REMITENTE/SMTP_FROM)');
    }
  }
  if (faltantes.length > 0) {
    throw new Error(
      `CORREO_CANAL=${canal} exige las variables: ${faltantes.join(', ')}. Configúrelas o use CORREO_CANAL=ninguno.`,
    );
  }
}
