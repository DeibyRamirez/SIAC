import { prepararEnvioResend, resolverRemitenteCorreo } from './resolver-envio-resend';

describe('resolverRemitenteCorreo', () => {
  it('prioriza CORREO_DESDE', () => {
    const remitente = resolverRemitenteCorreo((clave) => {
      if (clave === 'CORREO_DESDE') return 'A <a@test.com>';
      if (clave === 'CORREO_REMITENTE') return 'B <b@test.com>';
      return undefined;
    });
    expect(remitente).toBe('A <a@test.com>');
  });

  it('usa CORREO_REMITENTE si no hay CORREO_DESDE', () => {
    const remitente = resolverRemitenteCorreo((clave) => {
      if (clave === 'CORREO_REMITENTE') return 'Fest <fest@send.cheiviz.com>';
      if (clave === 'SMTP_FROM') return 'smtp@test.com';
      return undefined;
    });
    expect(remitente).toBe('Fest <fest@send.cheiviz.com>');
  });

  it('usa fallback si no hay variables', () => {
    expect(resolverRemitenteCorreo(() => undefined, 'fallback@test.com')).toBe(
      'fallback@test.com',
    );
  });
});

describe('prepararEnvioResend', () => {
  const mensaje = {
    destinatario: 'revisor.calidad@uniautonoma.edu.co',
    asunto: 'Revisión pendiente',
    textoPlano: 'Hay una evidencia por revisar.',
  };

  it('sin sandbox envía al destinatario original', () => {
    const preparado = prepararEnvioResend(mensaje, undefined);
    expect(preparado.redirigidoSandbox).toBe(false);
    expect(preparado.destinatario).toBe(mensaje.destinatario);
    expect(preparado.asunto).toBe(mensaje.asunto);
    expect(preparado.textoPlano).toBe(mensaje.textoPlano);
  });

  it('con sandbox redirige y anota destinatario real', () => {
    const preparado = prepararEnvioResend(mensaje, 'deibyalejandroramirez13@gmail.com');
    expect(preparado.redirigidoSandbox).toBe(true);
    expect(preparado.destinatario).toBe('deibyalejandroramirez13@gmail.com');
    expect(preparado.destinatarioOriginal).toBe(mensaje.destinatario);
    expect(preparado.asunto).toContain('[DEV → revisor.calidad@uniautonoma.edu.co]');
    expect(preparado.asunto).toContain('Revisión pendiente');
    expect(preparado.textoPlano).toContain('Destinatario original: revisor.calidad@uniautonoma.edu.co');
  });
});
