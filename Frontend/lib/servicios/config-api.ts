/** URL del backend NestJS en desarrollo local (solo como respaldo fuera de producción). */
export const URL_BACKEND_DESARROLLO = 'http://localhost:3001/api/v1';

/**
 * URL del backend NestJS (solo servidor / BFF: `app/api/sesion`, `app/api/v1/[...ruta]`).
 * - Producción (Vercel): `API_URL_INTERNAL` = URL de Render + `/api/v1` (obligatoria).
 *   `NEXT_PUBLIC_API_URL` se acepta como respaldo por compatibilidad.
 * - Desarrollo: si no hay variables, usa `http://localhost:3001/api/v1`.
 */
export function urlBackendInterna(): string {
  const configurada =
    process.env.API_URL_INTERNAL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Falta API_URL_INTERNAL: defina la URL del backend en Render (p. ej. https://siac-api.onrender.com/api/v1).',
    );
  }
  return URL_BACKEND_DESARROLLO;
}

/** Base relativa del proxy BFF en el navegador. */
export const URL_BASE_CLIENTE = '/api/v1';

export const NOMBRE_COOKIE_SESION = 'siac_sesion';

/**
 * El navegador siempre habla con el BFF del mismo dominio (`/api/v1`), así que la API se
 * considera disponible; la URL real del backend solo la resuelve el servidor de Next.
 */
export function apiDisponible(): boolean {
  return URL_BASE_CLIENTE.length > 0;
}
