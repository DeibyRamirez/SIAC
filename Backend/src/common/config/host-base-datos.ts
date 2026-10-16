/**
 * T-007.3i: verificación del host de `DATABASE_URL` para pruebas E2E y scripts que escriben datos.
 * Solo se consideran desechables los hosts locales (localhost/127.0.0.1) y el servicio `postgres`
 * de CI, o los hosts que cada llamador declare explícitamente.
 */

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', 'postgres']);

/** Devuelve el hostname de DATABASE_URL; lanza un Error si falta o no es una URL válida. */
export function hostDeUrlBaseDatos(url: string | undefined): string {
  try {
    return new URL(url ?? '').hostname;
  } catch {
    throw new Error('DATABASE_URL no es una URL válida.');
  }
}

/** ¿El host es local/CI o está en la lista de hosts permitidos del llamador? */
export function esHostDesechable(
  host: string,
  hostsPermitidos: Iterable<string> = [],
): boolean {
  const normalizado = host.trim().toLowerCase();
  if (!normalizado) return false;
  if (HOSTS_LOCALES.has(normalizado)) return true;
  for (const permitido of hostsPermitidos) {
    if (permitido.trim().toLowerCase() === normalizado) return true;
  }
  return false;
}
