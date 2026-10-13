import type { FiltrosCifrasCategoria } from '@/lib/tipos/cifras'

export const OPCION_TODOS_CIFRAS = 'todos'

export interface FiltrosCifrasUrl {
  periodo: string
  facultad: string
  programa: string
  sede: string
}

type ParametrosEntrada = URLSearchParams | Record<string, string | string[] | undefined>

function leer(params: ParametrosEntrada, clave: string): string {
  if (params instanceof URLSearchParams) return params.get(clave) ?? ''
  const valor = params[clave]
  return (Array.isArray(valor) ? valor[0] : valor) ?? ''
}

export function leerFiltrosCifrasUrl(params: ParametrosEntrada): FiltrosCifrasUrl {
  return {
    periodo: leer(params, 'periodo').trim(),
    facultad: leer(params, 'facultad') || OPCION_TODOS_CIFRAS,
    programa: leer(params, 'programa') || OPCION_TODOS_CIFRAS,
    sede: leer(params, 'sede') || OPCION_TODOS_CIFRAS,
  }
}

/** URL compartible: omite los valores por defecto para que el enlace sea corto y estable. */
export function construirUrlCifras(filtros: FiltrosCifrasUrl, base: string): string {
  const params = new URLSearchParams()
  if (filtros.periodo.trim()) params.set('periodo', filtros.periodo.trim())
  if (filtros.facultad !== OPCION_TODOS_CIFRAS) params.set('facultad', filtros.facultad)
  if (filtros.programa !== OPCION_TODOS_CIFRAS) params.set('programa', filtros.programa)
  if (filtros.sede !== OPCION_TODOS_CIFRAS) params.set('sede', filtros.sede)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/** Traduce los filtros de la URL a los parámetros de GET /cifras/:categoriaId. */
export function filtrosCifrasParaApi(filtros: FiltrosCifrasUrl): FiltrosCifrasCategoria {
  return {
    periodo: filtros.periodo || undefined,
    facultad: filtros.facultad === OPCION_TODOS_CIFRAS ? undefined : filtros.facultad,
    programa: filtros.programa === OPCION_TODOS_CIFRAS ? undefined : filtros.programa,
    sede: filtros.sede === OPCION_TODOS_CIFRAS ? undefined : filtros.sede,
  }
}

/** Compara valores de filtro sin distinguir mayúsculas ni tildes (para validar contra las opciones). */
export function normalizarValorFiltro(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Devuelve el valor canónico de la opción que coincide con el valor dado, si existe. */
export function coincidirOpcionFiltro(opciones: string[], valor: string): string | undefined {
  if (!valor || valor === OPCION_TODOS_CIFRAS) return undefined
  const objetivo = normalizarValorFiltro(valor)
  return opciones.find((opcion) => normalizarValorFiltro(opcion) === objetivo)
}
