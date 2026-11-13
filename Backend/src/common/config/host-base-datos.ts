/**
 * T-007.3i: verificación del host de `DATABASE_URL` para pruebas E2E y scripts que escriben datos.
 * Solo se consideran desechables los hosts locales (localhost/127.0.0.1) y el servicio `postgres`
 * de CI, o los hosts que cada llamador declare explícitamente.
 * Con NODE_ENV=production ningún script destructivo debe correr, sin importar host ni banderas SIAC_*.
 */

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', 'postgres']);

/** Aborta si NODE_ENV=production (scripts de prueba, Newman, setup destructivo). */
export function abortarScriptSiProduccion(contexto: string): void {
  if ((process.env.NODE_ENV ?? '').trim() === 'production') {
    throw new Error(
      `[${contexto}] Abortado: NODE_ENV=production. Este script no puede ejecutarse en producción.`,
    );
  }
}

/** Usuario de la URL de Postgres (sin contraseña ni host). */
export function usuarioDeUrlBaseDatos(url: string | undefined): string {
  const cadena = url?.trim() ?? '';
  if (!cadena) {
    throw new Error('DATABASE_URL vacía.');
  }
  const normalizada = cadena.replace(/^postgres(ql)?:\/\//i, 'http://');
  const parsed = new URL(normalizada);
  const usuario = decodeURIComponent(parsed.username);
  if (!usuario) {
    throw new Error('La URL de base de datos no incluye usuario.');
  }
  return usuario;
}

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
