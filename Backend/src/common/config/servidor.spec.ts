import {
  ORIGEN_FRONTEND_DESARROLLO,
  normalizarOrigen,
  resolverOrigenesCors,
  resolverPuerto,
  validarEntornoProduccion,
} from './servidor';

describe('resolverPuerto (Render usa PORT)', () => {
  it('prioriza PORT sobre PUERTO', () => {
    expect(resolverPuerto({ PORT: '10000', PUERTO: '3001' })).toBe(10000);
  });

  it('usa PUERTO en local y 3001 por defecto', () => {
    expect(resolverPuerto({ PUERTO: '4000' })).toBe(4000);
    expect(resolverPuerto({})).toBe(3001);
  });

  it('ignora valores no numéricos', () => {
    expect(resolverPuerto({ PORT: 'abc' })).toBe(3001);
  });
});

describe('resolverOrigenesCors', () => {
  it('lee CORS_ORIGENES separado por comas y quita espacios y barra final', () => {
    expect(
      resolverOrigenesCors({
        CORS_ORIGENES: ' https://siac.vercel.app/ , https://siac.uniautonoma.edu.co',
        NODE_ENV: 'production',
      }),
    ).toEqual(['https://siac.vercel.app', 'https://siac.uniautonoma.edu.co']);
  });

  it('acepta CORS_ORIGEN (nombre anterior) y FRONTEND_URL sin duplicar', () => {
    expect(
      resolverOrigenesCors({
        CORS_ORIGENES: 'https://siac.vercel.app',
        CORS_ORIGEN: 'http://localhost:3000',
        FRONTEND_URL: 'https://siac.vercel.app/',
      }),
    ).toEqual(['https://siac.vercel.app', 'http://localhost:3000']);
  });

  it('sin variables usa localhost:3000 fuera de producción', () => {
    expect(resolverOrigenesCors({ NODE_ENV: 'development' })).toEqual([ORIGEN_FRONTEND_DESARROLLO]);
  });

  it('sin variables en producción no permite ningún origen', () => {
    expect(resolverOrigenesCors({ NODE_ENV: 'production' })).toEqual([]);
  });

  it('normalizarOrigen elimina la barra final', () => {
    expect(normalizarOrigen('https://a.vercel.app//')).toBe('https://a.vercel.app');
  });
});

describe('validarEntornoProduccion', () => {
  const completo = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://u:p@pooler:6543/postgres?pgbouncer=true',
    JWT_SECRETO: 'x'.repeat(32),
    FRONTEND_URL: 'https://siac.vercel.app',
    S3_USAR_ALMACEN_LOCAL: 'false',
    TZ: 'America/Bogota',
    CORREO_CANAL: 'resend',
    RESEND_API_KEY: 're_prueba',
    CORREO_DESDE: 'SIAC <notificaciones@siac.test>',
  };

  it('no revisa nada fuera de producción', () => {
    expect(validarEntornoProduccion({ NODE_ENV: 'development' })).toEqual({
      errores: [],
      advertencias: [],
    });
  });

  it('con la configuración completa no hay errores ni advertencias', () => {
    expect(validarEntornoProduccion(completo)).toEqual({ errores: [], advertencias: [] });
  });

  it('exige JWT_SECRETO y DATABASE_URL en producción', () => {
    const { errores } = validarEntornoProduccion({ NODE_ENV: 'production' });
    expect(errores).toHaveLength(2);
    expect(errores.join(' ')).toMatch(/JWT_SECRETO/);
  });

  it('advierte de almacén local, TZ y FRONTEND_URL', () => {
    const { errores, advertencias } = validarEntornoProduccion({
      ...completo,
      FRONTEND_URL: '',
      S3_USAR_ALMACEN_LOCAL: 'true',
      TZ: '',
    });
    expect(errores).toEqual([]);
    expect(advertencias).toHaveLength(4);
  });
});
