import { ConfigService } from '@nestjs/config';

export type CanalCorreo = 'resend' | 'smtp' | 'ninguno';

export function resolverCanalCorreo(config: ConfigService): CanalCorreo {
  const explicito = (config.get<string>('CORREO_CANAL') ?? '').trim().toLowerCase();
  if (explicito === 'resend' || explicito === 'smtp' || explicito === 'ninguno') {
    return explicito;
  }
  if (config.get<string>('RESEND_API_KEY')) return 'resend';
  if (config.get<string>('SMTP_HOST')) return 'smtp';
  return 'ninguno';
}
