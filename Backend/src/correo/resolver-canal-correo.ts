import { ConfigService } from '@nestjs/config';

export type CanalCorreo = 'resend' | 'smtp' | 'ninguno';

/**
 * T-007.3f: `CORREO_CANAL` explícito manda (`resend`/`smtp`/`ninguno`).
 * Sin `CORREO_CANAL` definido el canal es `ninguno`: no se deduce por tener credenciales.
 */
export function resolverCanalCorreo(config: ConfigService): CanalCorreo {
  const explicito = (config.get<string>('correoCanal') ?? config.get<string>('CORREO_CANAL') ?? '')
    .trim()
    .toLowerCase();
  return explicito === 'resend' || explicito === 'smtp' ? explicito : 'ninguno';
}

/**
 * Fix K (27/10): advertencias del canal de correo al arrancar. Un valor no reconocido se trata como
 * «ninguno» y se avisa; en producción, sin canal también se avisa (los correos quedan Descartado).
 */
export function advertenciasCanalCorreo(
  valor: string | undefined,
  entorno: string | undefined,
): string[] {
  const normalizado = (valor ?? '').trim().toLowerCase();
  const advertencias: string[] = [];
  if (normalizado && !['resend', 'smtp', 'ninguno'].includes(normalizado)) {
    advertencias.push(
      `CORREO_CANAL="${valor}" no es válido (use resend, smtp o ninguno): se usa «ninguno» y no se envían correos.`,
    );
  } else if (entorno === 'production' && (normalizado === '' || normalizado === 'ninguno')) {
    advertencias.push(
      'CORREO_CANAL vacío o «ninguno» en producción: no se envía ningún correo (el outbox los marca Descartado).',
    );
  }
  return advertencias;
}
