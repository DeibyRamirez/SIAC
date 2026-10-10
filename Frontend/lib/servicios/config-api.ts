/** URL del backend NestJS (solo servidor / BFF). */
export function urlBackendInterna(): string {
  return (
    process.env.API_URL_INTERNAL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001/api/v1'
  );
}

/** Base relativa del proxy BFF en el navegador. */
export const URL_BASE_CLIENTE = '/api/v1';

export const NOMBRE_COOKIE_SESION = 'siac_sesion';

export function apiDisponible(): boolean {
  return Boolean(urlBackendInterna());
}
