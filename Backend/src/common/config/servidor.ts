/**
 * Configuración del servidor HTTP para despliegue (Render) y desarrollo local.
 * Render inyecta `PORT`; en local se mantiene `PUERTO` (por defecto 3001).
 */

/** Origen del frontend en desarrollo local (Next.js). */
export const ORIGEN_FRONTEND_DESARROLLO = 'http://localhost:3000';

type VariablesEntorno = Record<string, string | undefined>;

/** Puerto de escucha: `PORT` (Render) tiene prioridad sobre `PUERTO` (local). */
export function resolverPuerto(entorno: VariablesEntorno = process.env): number {
  const crudo = entorno.PORT?.trim() || entorno.PUERTO?.trim() || '3001';
  const puerto = Number.parseInt(crudo, 10);
  return Number.isInteger(puerto) && puerto > 0 ? puerto : 3001;
}

/** Quita espacios y la barra final para comparar con la cabecera `Origin` del navegador. */
export function normalizarOrigen(valor: string): string {
  return valor.trim().replace(/\/+$/, '');
}

/**
 * Orígenes CORS permitidos.
 * - `CORS_ORIGENES`: lista separada por comas (p. ej. dominio de Vercel y dominio propio).
 * - `CORS_ORIGEN`: nombre anterior (un solo origen o lista), se mantiene por compatibilidad.
 * - `FRONTEND_URL`: URL pública del frontend (también se usa en los enlaces de los correos).
 * Sin ninguna variable: `http://localhost:3000` fuera de producción y lista vacía en producción
 * (el navegador no llama al backend directamente: el BFF de Next lo hace servidor a servidor).
 */
export function resolverOrigenesCors(entorno: VariablesEntorno = process.env): string[] {
  const origenes = [entorno.CORS_ORIGENES, entorno.CORS_ORIGEN, entorno.FRONTEND_URL]
    .filter((valor): valor is string => Boolean(valor))
    .flatMap((valor) => valor.split(','))
    .map(normalizarOrigen)
    .filter(Boolean);
  const unicos = [...new Set(origenes)];
  if (unicos.length === 0 && entorno.NODE_ENV !== 'production') {
    return [ORIGEN_FRONTEND_DESARROLLO];
  }
  return unicos;
}

export interface ResultadoValidacionEntorno {
  /** Configuración que impide arrancar con seguridad (el proceso termina). */
  errores: string[];
  /** Configuración incompleta que no impide arrancar, pero degrada alguna funcionalidad. */
  advertencias: string[];
}

/**
 * Revisión mínima del entorno cuando NODE_ENV=production (Render).
 * No valida credenciales: solo evita arrancar con el secreto JWT de desarrollo y avisa de
 * variables que, si faltan, dejan enlaces a localhost o archivos en disco efímero.
 */
export function validarEntornoProduccion(
  entorno: VariablesEntorno = process.env,
): ResultadoValidacionEntorno {
  const errores: string[] = [];
  const advertencias: string[] = [];
  if (entorno.NODE_ENV !== 'production') return { errores, advertencias };

  if (!entorno.DATABASE_URL?.trim()) errores.push('Falta DATABASE_URL.');
  if (!entorno.JWT_SECRETO?.trim()) {
    errores.push('Falta JWT_SECRETO (no se permite el secreto de desarrollo en producción).');
  }
  if (!entorno.FRONTEND_URL?.trim()) {
    advertencias.push('Falta FRONTEND_URL: los enlaces de los correos apuntarán a localhost.');
  }
  if (resolverOrigenesCors(entorno).length === 0) {
    advertencias.push('CORS_ORIGENES vacío: solo funcionará el acceso vía BFF de Next (servidor a servidor).');
  }
  if (entorno.S3_USAR_ALMACEN_LOCAL === 'true') {
    advertencias.push(
      'S3_USAR_ALMACEN_LOCAL=true: en Render el disco es efímero y los archivos se pierden al redeplegar.',
    );
  }
  if (entorno.TZ !== 'America/Bogota') {
    advertencias.push('TZ distinto de America/Bogota: defina TZ=America/Bogota para fechas y logs locales.');
  }
  return { errores, advertencias };
}
