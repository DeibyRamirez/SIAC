import {
  ErrorClavesSemilla,
  VARIABLES_CLAVE_SEMILLA,
  resolverClavesSemilla,
} from './claves-semilla';

const TODAS = Object.fromEntries(
  Object.values(VARIABLES_CLAVE_SEMILLA).map((v, i) => [v, `clave-larga-segura-${i}`]),
);

describe('resolverClavesSemilla (S-1: contraseñas fuera del repositorio)', () => {
  it('usa las variables SEMILLA_CLAVE_* cuando están definidas', () => {
    const claves = resolverClavesSemilla({ NODE_ENV: 'production', ...TODAS });
    expect(claves.Administrador).toBe(TODAS.SEMILLA_CLAVE_ADMINISTRADOR);
    expect(claves.SuperAdmin).toBe(TODAS.SEMILLA_CLAVE_SUPERADMIN);
  });

  it('en producción aborta nombrando las variables que faltan', () => {
    const { SEMILLA_CLAVE_ADMINISTRADOR: _a, SEMILLA_CLAVE_REVISOR: _r, ...resto } = TODAS;
    expect(() => resolverClavesSemilla({ NODE_ENV: 'production', ...resto })).toThrow(
      ErrorClavesSemilla,
    );
    expect(() => resolverClavesSemilla({ NODE_ENV: 'production', ...resto })).toThrow(
      /faltan SEMILLA_CLAVE_REVISOR, SEMILLA_CLAVE_ADMINISTRADOR/,
    );
  });

  it('en producción trata una variable vacía o con espacios como faltante', () => {
    expect(() =>
      resolverClavesSemilla({ NODE_ENV: 'production', ...TODAS, SEMILLA_CLAVE_CARGADOR: '  ' }),
    ).toThrow(/faltan SEMILLA_CLAVE_CARGADOR/);
  });

  it('en producción rechaza claves de menos de 12 caracteres', () => {
    expect(() =>
      resolverClavesSemilla({ NODE_ENV: 'production', ...TODAS, SEMILLA_CLAVE_SUPERADMIN: 'corta' }),
    ).toThrow(/SEMILLA_CLAVE_SUPERADMIN con menos de 12 caracteres/);
  });

  it('en desarrollo usa claves de desarrollo para las que faltan y respeta las definidas', () => {
    const claves = resolverClavesSemilla({
      NODE_ENV: 'development',
      SEMILLA_CLAVE_ADMINISTRADOR: 'propia',
    });
    expect(claves.Administrador).toBe('propia');
    expect(claves.Cargador).toBe('SiacDev-Cargador');
  });

  it('sin NODE_ENV (CI, pruebas) se comporta como desarrollo', () => {
    expect(() => resolverClavesSemilla({})).not.toThrow();
  });

  it('el mensaje de error nunca incluye los valores de las claves', () => {
    try {
      resolverClavesSemilla({ NODE_ENV: 'production', ...TODAS, SEMILLA_CLAVE_PAR: 'secreto1' });
      throw new Error('debía fallar');
    } catch (error) {
      expect((error as Error).message).not.toContain('secreto1');
      expect((error as Error).message).not.toContain('clave-larga-segura');
    }
  });
});
