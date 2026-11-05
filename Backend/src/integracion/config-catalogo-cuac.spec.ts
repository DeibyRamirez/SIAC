import { esSincronizacionCuacHabilitada } from './config-catalogo-cuac';

describe('esSincronizacionCuacHabilitada', () => {
  it('respeta CARRERAS_SYNC_HABILITADO=false', () => {
    expect(
      esSincronizacionCuacHabilitada({
        CARRERAS_SYNC_HABILITADO: 'false',
        NODE_ENV: 'production',
      }),
    ).toBe(false);
  });

  it('permite forzar true en NODE_ENV=test', () => {
    expect(
      esSincronizacionCuacHabilitada({
        CARRERAS_SYNC_HABILITADO: 'true',
        NODE_ENV: 'test',
      }),
    ).toBe(true);
  });

  it('queda desactivada en NODE_ENV=test sin bandera explícita', () => {
    expect(esSincronizacionCuacHabilitada({ NODE_ENV: 'test' })).toBe(false);
  });

  it('queda activa en producción por defecto', () => {
    expect(esSincronizacionCuacHabilitada({ NODE_ENV: 'production' })).toBe(true);
  });
});
