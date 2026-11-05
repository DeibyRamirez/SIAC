import { ConfigService } from '@nestjs/config';
import { advertenciasCanalCorreo, resolverCanalCorreo } from './resolver-canal-correo';

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
    expect(
      resolverCanalCorreo(configMock({ CORREO_CANAL: 'resend', RESEND_API_KEY: 're_1' })),
    ).toBe('resend');
    expect(resolverCanalCorreo(configMock({ correoCanal: 'ninguno' }))).toBe('ninguno');
  });

  it('sin CORREO_CANAL no deduce el canal aunque haya credenciales (→ ninguno)', () => {
    expect(
      resolverCanalCorreo(configMock({ RESEND_API_KEY: 're_123', SMTP_HOST: 'mail.local' })),
    ).toBe('ninguno');
  });

  it('valor desconocido o vacío → ninguno', () => {
    expect(resolverCanalCorreo(configMock({ CORREO_CANAL: 'otro' }))).toBe('ninguno');
    expect(resolverCanalCorreo(configMock({ CORREO_CANAL: '  ' }))).toBe('ninguno');
  });

  it('devuelve ninguno sin configuración', () => {
    expect(resolverCanalCorreo(configMock({}))).toBe('ninguno');
  });
});

describe('advertenciasCanalCorreo (fix K)', () => {
  it('valor no válido avisa en cualquier entorno', () => {
    expect(advertenciasCanalCorreo('resnd', 'development')[0]).toMatch(/no es válido/);
    expect(advertenciasCanalCorreo('resnd', 'production')[0]).toMatch(/no es válido/);
  });

  it('sin canal en producción avisa; en desarrollo no', () => {
    expect(advertenciasCanalCorreo(undefined, 'production')[0]).toMatch(/Descartado/);
    expect(advertenciasCanalCorreo('ninguno', 'production')).toHaveLength(1);
    expect(advertenciasCanalCorreo(undefined, 'development')).toEqual([]);
    expect(advertenciasCanalCorreo('resend', 'production')).toEqual([]);
  });
});
