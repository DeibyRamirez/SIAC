import { validarConfiguracionCorreo } from './validar-configuracion-correo';

describe('validarConfiguracionCorreo (T-007.3f)', () => {
  it('smtp exige SMTP_HOST y remitente', () => {
    expect(() =>
      validarConfiguracionCorreo('smtp', { smtpHost: 'mail.x', correoDesde: 'SIAC <x@y>' }),
    ).not.toThrow();
    expect(() => validarConfiguracionCorreo('smtp', {})).toThrow(/SMTP_HOST/);
    expect(() => validarConfiguracionCorreo('smtp', {})).toThrow(/CORREO_DESDE/);
    expect(() => validarConfiguracionCorreo('smtp', { smtpHost: 'mail.x' })).toThrow(
      /CORREO_DESDE/,
    );
  });

  it('smtp acepta CORREO_REMITENTE o SMTP_FROM como respaldo de CORREO_DESDE', () => {
    expect(() =>
      validarConfiguracionCorreo('smtp', {
        smtpHost: 'mail.x',
        correoRemitente: 'SIAC <remitente@x>',
      }),
    ).not.toThrow();
    expect(() =>
      validarConfiguracionCorreo('smtp', { smtpHost: 'mail.x', smtpFrom: 'smtp@x' }),
    ).not.toThrow();
  });

  it('resend exige RESEND_API_KEY y remitente', () => {
    expect(() =>
      validarConfiguracionCorreo('resend', { resendApiKey: 're_1', correoDesde: 'SIAC <x@y>' }),
    ).not.toThrow();
    expect(() => validarConfiguracionCorreo('resend', {})).toThrow(/RESEND_API_KEY/);
    expect(() => validarConfiguracionCorreo('resend', { resendApiKey: 're_1' })).toThrow(
      /CORREO_DESDE/,
    );
  });

  it('resend acepta CORREO_REMITENTE o SMTP_FROM como respaldo de CORREO_DESDE', () => {
    expect(() =>
      validarConfiguracionCorreo('resend', {
        resendApiKey: 're_1',
        correoRemitente: 'SIAC <remitente@x>',
      }),
    ).not.toThrow();
    expect(() =>
      validarConfiguracionCorreo('resend', { resendApiKey: 're_1', smtpFrom: 'smtp@x' }),
    ).not.toThrow();
  });

  it('ninguno no exige variables', () => {
    expect(() => validarConfiguracionCorreo('ninguno', {})).not.toThrow();
  });
});
