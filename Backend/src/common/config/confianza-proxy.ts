import { INestApplication } from '@nestjs/common';

type VariablesEntorno = Record<string, string | undefined>;

/**
 * Cuántos saltos de proxy confiar para `req.ip` (Express `trust proxy`).
 * - `false`: solo la IP del socket; se ignora `X-Forwarded-For` (evita spoofing si la API es accesible directamente).
 * - `1` (u otro entero): típico detrás de Render, nginx o el reverse proxy del compose universitario.
 */
export function resolverSaltosConfianzaProxy(
  entorno: VariablesEntorno = process.env,
): number | false {
  const crudo = entorno.TRUST_PROXY?.trim();
  if (crudo === 'false' || crudo === '0') {
    return false;
  }
  if (crudo === 'true') {
    return 1;
  }
  if (crudo) {
    const saltos = Number.parseInt(crudo, 10);
    if (Number.isInteger(saltos) && saltos > 0) {
      return saltos;
    }
  }
  if (entorno.NODE_ENV === 'production') {
    return 1;
  }
  return false;
}

/**
 * Ajusta Express tras crear la app Nest. Documentación: docs/despliegue-docker.md (límite de login y proxy).
 */
export function configurarConfianzaProxy(app: INestApplication): void {
  const saltos = resolverSaltosConfianzaProxy();
  const http = app.getHttpAdapter().getInstance() as {
    set: (clave: string, valor: number | false) => void;
  };
  if (saltos === false) {
    http.set('trust proxy', false);
    console.log(
      '[configuración] trust proxy desactivado: el rate limit de login usa la IP del socket (no X-Forwarded-For).',
    );
    return;
  }
  http.set('trust proxy', saltos);
  console.log(
    `[configuración] trust proxy=${saltos}: req.ip proviene del proxy de confianza; no exponga la API sin proxy en producción.`,
  );
}
