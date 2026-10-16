/**
 * Utilidades de Power BI en el frontend (HU-009, T-009.3).
 * Las URL públicas se consultan en el servidor (`ConfiguracionInformePowerBi`).
 */
/** Prefijo obligatorio de una URL de «Publicar en la web». */
export const PREFIJO_URL_PUBLICA_POWERBI = 'https://app.powerbi.com/view?r='

/** Tiempo máximo de espera del iframe antes de mostrar el respaldo. */
export const TIEMPO_MAXIMO_CARGA_INFORME_MS = 20_000

export type ModoPowerBi = 'publico' | 'embebido'

/**
 * Acepta URL limpia o HTML de iframe («Publicar en la web» pegado desde Power BI).
 * Devuelve la primera URL válida encontrada o null.
 */
export function extraerUrlPublicaPowerBi(valor: string | null | undefined): string | null {
  const crudo = valor?.trim() ?? ''
  if (!crudo) return null
  if (esUrlPublicaPowerBiValida(crudo)) return crudo

  const patron = new RegExp(
    `${PREFIJO_URL_PUBLICA_POWERBI.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"'\\s>]+`,
    'i',
  )
  const coincidencia = crudo.match(patron)?.[0]
  if (coincidencia && esUrlPublicaPowerBiValida(coincidencia)) return coincidencia
  return null
}

/** Valida que la URL sea una vista pública de Power BI (https://app.powerbi.com/view?r=...). */
export function esUrlPublicaPowerBiValida(url: string | null | undefined): boolean {
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

/** Clasifica una URL devuelta por la API (o vacía si no hay configuración). */
export function estadoDesdeUrlPublica(url: string | null | undefined): EstadoUrlPowerBi {
  const cruda = url?.trim() ?? ''
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
