/**
 * Utilidades de Power BI en el frontend (HU-009, T-009.3).
 * Las URL se consultan en el servidor (`ConfiguracionInformePowerBi`).
 */
import {
  analizarUrlInformePowerBi,
  clasificarUrlInformePowerBi,
  prepararUrlInformePowerBi,
  type TipoEnlaceInformePowerBi,
} from './validar-url-informe'

export {
  analizarUrlInformePowerBi,
  clasificarUrlInformePowerBi,
  prepararUrlInformePowerBi,
  type TipoEnlaceInformePowerBi,
}

/** Tiempo máximo de espera del iframe antes de mostrar el respaldo. */
export const TIEMPO_MAXIMO_CARGA_INFORME_MS = 20_000

/** Aviso de «Publicar en la web» (ADR-009). El enlace reportEmbed no lo sustituye. */
export const AVISO_ENLACE_PUBLICO_POWERBI =
  '«Publicar en la web» hace público el informe en internet, sin autenticación.'

/** Aviso del enlace seguro reportEmbed. */
export const AVISO_ENLACE_SEGURO_POWERBI =
  'Requiere que el usuario inicie sesión en Microsoft, tenga licencia Power BI Pro y acceso al área de trabajo SIAC'

export type ModoPowerBi = 'publico' | 'embebido'

/**
 * Acepta URL limpia o HTML de iframe pegado desde Power BI.
 * Devuelve la primera URL válida encontrada o null.
 */
export function extraerUrlPublicaPowerBi(valor: string | null | undefined): string | null {
  const url = prepararUrlInformePowerBi(valor)
  return url || null
}

/** Valida un enlace de informe: `/view?r=` o `reportEmbed` en app.powerbi.com. */
export function esUrlPublicaPowerBiValida(url: string | null | undefined): boolean {
  return analizarUrlInformePowerBi(url) !== null
}

export type EstadoUrlPowerBi =
  | { estado: 'publicada'; url: string; tipo: TipoEnlaceInformePowerBi }
  | { estado: 'no-publicada' }
  | { estado: 'invalida' }

/** Clasifica una URL devuelta por la API (o vacía si no hay configuración). */
export function estadoDesdeUrlPublica(url: string | null | undefined): EstadoUrlPowerBi {
  const cruda = url?.trim() ?? ''
  if (!cruda) return { estado: 'no-publicada' }
  const analizada = analizarUrlInformePowerBi(cruda)
  if (!analizada) return { estado: 'invalida' }
  return { estado: 'publicada', url: analizada.url, tipo: analizada.tipo }
}

/**
 * Modo de integración. `publico` (por defecto) usa la URL guardada del informe;
 * `embebido` (App Owns Data, T-009.2) queda bloqueado hasta tener credenciales Azure
 * y conserva la ruta simulada con el backend.
 */
export function obtenerModoPowerBi(): ModoPowerBi {
  return process.env.POWERBI_MODO?.trim().toLowerCase() === 'embebido' ? 'embebido' : 'publico'
}
