/**
 * Configuración de Power BI en el frontend (HU-009, T-009.3).
 *
 * Next.js reemplaza `process.env.NEXT_PUBLIC_*` en tiempo de compilación solo cuando la
 * referencia es estática; por eso cada variable se lee con su nombre literal y nunca con
 * una clave dinámica (`process.env[nombre]` llegaría vacía al navegador).
 */
import type { CategoriaIdPowerBi } from '@/lib/informes-powerbi'

/** Prefijo obligatorio de una URL de «Publicar en la web». */
export const PREFIJO_URL_PUBLICA_POWERBI = 'https://app.powerbi.com/view?r='

/** Tiempo máximo de espera del iframe antes de mostrar el respaldo. */
export const TIEMPO_MAXIMO_CARGA_INFORME_MS = 20_000

export type ModoPowerBi = 'publico' | 'embebido'

/** Lee la URL cruda de la variable de entorno de cada categoría (referencias estáticas). */
export function leerUrlCrudaPowerBi(categoriaId: CategoriaIdPowerBi): string | undefined {
  switch (categoriaId) {
    case 'aseguramiento':
      return process.env.NEXT_PUBLIC_POWERBI_URL_ASEGURAMIENTO
    case 'infraestructura':
      return process.env.NEXT_PUBLIC_POWERBI_URL_INFRAESTRUCTURA
    case 'egresados':
      return process.env.NEXT_PUBLIC_POWERBI_URL_EGRESADOS
    case 'investigacion':
      return process.env.NEXT_PUBLIC_POWERBI_URL_INVESTIGACION
    case 'profesores':
      return process.env.NEXT_PUBLIC_POWERBI_URL_PROFESORES
    case 'estudiantes':
      return process.env.NEXT_PUBLIC_POWERBI_URL_ESTUDIANTES
  }
}

/** Valida que la URL sea una vista pública de Power BI (https://app.powerbi.com/view?r=...). */
export function esUrlPublicaPowerBiValida(url: string | null | undefined): url is string {
  if (!url) return false
  const limpia = url.trim()
  if (!limpia.startsWith(PREFIJO_URL_PUBLICA_POWERBI)) return false
  if (limpia.length === PREFIJO_URL_PUBLICA_POWERBI.length) return false
  try {
    const analizada = new URL(limpia)
    return (
      analizada.protocol === 'https:' &&
      analizada.hostname === 'app.powerbi.com' &&
      analizada.pathname === '/view' &&
      Boolean(analizada.searchParams.get('r'))
    )
  } catch {
    return false
  }
}

export type EstadoUrlPowerBi =
  | { estado: 'publicada'; url: string }
  | { estado: 'no-publicada' }
  | { estado: 'invalida' }

/** Resuelve el estado de la URL pública de una categoría. */
export function resolverUrlPowerBi(categoriaId: CategoriaIdPowerBi): EstadoUrlPowerBi {
  const cruda = leerUrlCrudaPowerBi(categoriaId)?.trim()
  if (!cruda) return { estado: 'no-publicada' }
  if (!esUrlPublicaPowerBiValida(cruda)) return { estado: 'invalida' }
  return { estado: 'publicada', url: cruda }
}

/**
 * Modo de integración. `publico` (por defecto) usa «Publicar en la web»;
 * `embebido` (App Owns Data, T-009.2) queda bloqueado hasta tener credenciales Azure
 * y conserva la ruta simulada con el backend.
 */
export function obtenerModoPowerBi(): ModoPowerBi {
  return process.env.POWERBI_MODO?.trim().toLowerCase() === 'embebido' ? 'embebido' : 'publico'
}
