/**
 * Contraseñas de los usuarios semilla (`prisma/semilla.ts`), leídas de variables de entorno.
 *
 * - Producción (`NODE_ENV=production`): todas las variables son obligatorias y deben tener al
 *   menos 12 caracteres; si falta alguna, la semilla aborta con un mensaje que nombra cuáles.
 * - Desarrollo, pruebas y CI: si una variable falta se usa una clave de desarrollo conocida,
 *   que solo sirve para BD locales o desechables (las E2E la leen de aquí mismo).
 *
 * Las claves de desarrollo no deben usarse nunca en una BD compartida o de producción.
 */
export const VARIABLES_CLAVE_SEMILLA = {
  Cargador: 'SEMILLA_CLAVE_CARGADOR',
  Revisor: 'SEMILLA_CLAVE_REVISOR',
  Administrador: 'SEMILLA_CLAVE_ADMINISTRADOR',
  SuperAdmin: 'SEMILLA_CLAVE_SUPERADMIN',
} as const;

export type RolSemilla = keyof typeof VARIABLES_CLAVE_SEMILLA;

export const LONGITUD_MINIMA_CLAVE_PRODUCCION = 12;

/** Solo para desarrollo local, pruebas y CI. */
const CLAVES_DESARROLLO: Record<RolSemilla, string> = {
  Cargador: 'SiacDev-Cargador',
  Revisor: 'SiacDev-Revisor',
  Administrador: 'SiacDev-Administrador',
  SuperAdmin: 'SiacDev-SuperAdmin',
};

export class ErrorClavesSemilla extends Error {}

export function resolverClavesSemilla(
  entorno: Record<string, string | undefined>,
): Record<RolSemilla, string> {
  const esProduccion = entorno.NODE_ENV?.trim() === 'production';
  const faltantes: string[] = [];
  const cortas: string[] = [];
  const claves = {} as Record<RolSemilla, string>;

  for (const rol of Object.keys(VARIABLES_CLAVE_SEMILLA) as RolSemilla[]) {
    const variable = VARIABLES_CLAVE_SEMILLA[rol];
    const valor = entorno[variable]?.trim();
    if (valor) {
      if (esProduccion && valor.length < LONGITUD_MINIMA_CLAVE_PRODUCCION) cortas.push(variable);
      claves[rol] = valor;
    } else if (esProduccion) {
      faltantes.push(variable);
    } else {
      claves[rol] = CLAVES_DESARROLLO[rol];
    }
  }

  if (faltantes.length > 0 || cortas.length > 0) {
    const partes: string[] = [];
    if (faltantes.length > 0) partes.push(`faltan ${faltantes.join(', ')}`);
    if (cortas.length > 0) {
      partes.push(
        `${cortas.join(', ')} con menos de ${LONGITUD_MINIMA_CLAVE_PRODUCCION} caracteres`,
      );
    }
    throw new ErrorClavesSemilla(
      `Semilla abortada con NODE_ENV=production: ${partes.join('; ')}. ` +
        'Define una contraseña propia por usuario semilla (ver Backend/.env.example).',
    );
  }
  return claves;
}
