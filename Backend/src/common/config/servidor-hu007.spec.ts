import { validarEntornoProduccion } from './servidor';

/** HU-006/HU-007: variables propias integradas en la validación de producción (Render). */
describe('validarEntornoProduccion (HU-007: vigencias y correo)', () => {
  const completo = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://u:p@pooler:6543/postgres?pgbouncer=true',
    JWT_SECRETO: 'x'.repeat(32),
    FRONTEND_URL: 'https://siac.vercel.app',
    S3_USAR_ALMACEN_LOCAL: 'false',
    TZ: 'America/Bogota',
  };

  it('VIGENCIA_MODO_PRUEBA en producción es error sin la bandera de staging', () => {
    const { errores } = validarEntornoProduccion({ ...completo, VIGENCIA_MODO_PRUEBA: 'true' });
    expect(errores.join(' ')).toMatch(/VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION/);
  });

  it('VIGENCIA_MODO_PRUEBA con la bandera explícita de staging no es error', () => {
    const { errores } = validarEntornoProduccion({
      ...completo,
      VIGENCIA_MODO_PRUEBA: '1',
      VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION: 'true',
    });
    expect(errores).toEqual([]);
  });

  it('CORREO_CANAL=smtp exige SMTP_HOST y remitente', () => {
    const { errores } = validarEntornoProduccion({ ...completo, CORREO_CANAL: 'smtp' });
    expect(errores.join(' ')).toMatch(/SMTP_HOST/);
  });

  it('CORREO_CANAL=resend completo y canal por defecto (ninguno) no generan errores; sin canal se advierte (fix K)', () => {
    expect(
      validarEntornoProduccion({
        ...completo,
        CORREO_CANAL: 'resend',
        RESEND_API_KEY: 're_x',
        CORREO_DESDE: 'SIAC <x@y.co>',
      }).errores,
    ).toEqual([]);
    const sinCanal = validarEntornoProduccion(completo);
    expect(sinCanal.errores).toEqual([]);
    expect(sinCanal.advertencias).toEqual([expect.stringMatching(/CORREO_CANAL vacío/)]);
  });

  it('CORREO_CANAL no válido se advierte (fix K)', () => {
    expect(validarEntornoProduccion({ ...completo, CORREO_CANAL: 'resned' }).advertencias).toEqual([
      expect.stringMatching(/no es válido/),
    ]);
  });

  it('advierte que CORREO_DESTINATARIOS_PERMITIDOS no aplica en producción', () => {
    const { errores, advertencias } = validarEntornoProduccion({
      ...completo,
      CORREO_DESTINATARIOS_PERMITIDOS: 'admin@uniautonoma.edu.co',
    });
    expect(errores).toEqual([]);
    expect(advertencias.join(' ')).toMatch(/CORREO_DESTINATARIOS_PERMITIDOS/);
  });
});
