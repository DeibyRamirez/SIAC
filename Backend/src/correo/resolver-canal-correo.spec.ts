import { ConfigService } from '@nestjs/config';
import { resolverCanalCorreo } from './resolver-canal-correo';

function configMock(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
}

describe('resolverCanalCorreo', () => {
  it('respeta CORREO_CANAL explícito', () => {
    expect(
      resolverCanalCorreo(configMock({ CORREO_CANAL: 'smtp', SMTP_HOST: 'x' })),
    ).toBe('smtp');
  });

  it('infiere resend si hay API key', () => {
    expect(resolverCanalCorreo(configMock({ RESEND_API_KEY: 're_123' }))).toBe('resend');
  });

  it('infiere smtp si hay host', () => {
    expect(resolverCanalCorreo(configMock({ SMTP_HOST: 'mail.local' }))).toBe('smtp');
  });

  it('devuelve ninguno sin configuración', () => {
    expect(resolverCanalCorreo(configMock({}))).toBe('ninguno');
  });
});
