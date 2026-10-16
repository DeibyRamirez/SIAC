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
