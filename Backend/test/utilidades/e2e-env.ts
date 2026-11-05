/**
 * Variables fijas para todas las E2E: no llamar a la API CUAC real ni revalidar en segundo plano.
 * Debe cargarse antes de importar AppModule (ver jest-e2e.json y crearAppE2E).
 */
process.env.CARRERAS_SYNC_HABILITADO = 'false';
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
