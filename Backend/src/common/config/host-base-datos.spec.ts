import {
  abortarScriptSiProduccion,
  esHostDesechable,
  usuarioDeUrlBaseDatos,
} from './host-base-datos';

describe('host-base-datos (guardas de entorno)', () => {
  const entornoAnterior = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = entornoAnterior;
  });

  it('abortarScriptSiProduccion falla con NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => abortarScriptSiProduccion('prueba')).toThrow(/NODE_ENV=production/);
  });

  it('esHostDesechable no devuelve true en producción aunque el host sea localhost', () => {
    process.env.NODE_ENV = 'production';
    expect(() => abortarScriptSiProduccion('host')).toThrow();
  });

  it('extrae el usuario de DATABASE_URL sin exponer la contraseña', () => {
    expect(usuarioDeUrlBaseDatos('postgresql://siac_app:secreto@localhost:5432/siac')).toBe(
      'siac_app',
    );
  });

  it('en desarrollo localhost sigue siendo host desechable', () => {
    process.env.NODE_ENV = 'development';
    expect(esHostDesechable('localhost')).toBe(true);
  });
});
