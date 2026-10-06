import { periodoAcademicoActual } from '@/lib/utilidades/periodo-academico'

export interface FiltrosBusquedaUrl {
  q?: string
  programa?: string
  codigoGuia?: string
  periodo?: string
  estado?: string
  puntajeMin?: string
  puntajeMax?: string
  semaforo?: string
  fechaCargaDesde?: string
  fechaCargaHasta?: string
  fechaVerificacionDesde?: string
  fechaVerificacionHasta?: string
  pagina?: string
  orden?: string
  direccion?: string
}

export function valorParamUrl(
  params: Record<string, string | string[] | undefined>,
  clave: string,
): string | undefined {
  const valor = params[clave]
  if (Array.isArray(valor)) return valor[0]
  return valor
}

export function leerFiltrosBusquedaUrl(
  params: Record<string, string | string[] | undefined>,
): FiltrosBusquedaUrl {
  return {
    q: valorParamUrl(params, 'q'),
    programa: valorParamUrl(params, 'programa'),
    codigoGuia: valorParamUrl(params, 'codigoGuia'),
    periodo: valorParamUrl(params, 'periodo'),
    estado: valorParamUrl(params, 'estado'),
    puntajeMin: valorParamUrl(params, 'puntajeMin'),
    puntajeMax: valorParamUrl(params, 'puntajeMax'),
    semaforo: valorParamUrl(params, 'semaforo'),
    fechaCargaDesde: valorParamUrl(params, 'fechaCargaDesde'),
    fechaCargaHasta: valorParamUrl(params, 'fechaCargaHasta'),
    fechaVerificacionDesde: valorParamUrl(params, 'fechaVerificacionDesde'),
    fechaVerificacionHasta: valorParamUrl(params, 'fechaVerificacionHasta'),
    pagina: valorParamUrl(params, 'pagina'),
    orden: valorParamUrl(params, 'orden'),
    direccion: valorParamUrl(params, 'direccion'),
  }
}

export function filtrosBusquedaAQuery(filtros: FiltrosBusquedaUrl): Record<string, string> {
  const salida: Record<string, string> = {}
  const entradas: [keyof FiltrosBusquedaUrl, string | undefined][] = [
    ['q', filtros.q],
    ['programa', filtros.programa],
    ['codigoGuia', filtros.codigoGuia],
    ['periodo', filtros.periodo],
    ['estado', filtros.estado],
    ['puntajeMin', filtros.puntajeMin],
    ['puntajeMax', filtros.puntajeMax],
    ['semaforo', filtros.semaforo],
    ['fechaCargaDesde', filtros.fechaCargaDesde],
    ['fechaCargaHasta', filtros.fechaCargaHasta],
    ['fechaVerificacionDesde', filtros.fechaVerificacionDesde],
    ['fechaVerificacionHasta', filtros.fechaVerificacionHasta],
    ['pagina', filtros.pagina],
    ['orden', filtros.orden],
    ['direccion', filtros.direccion],
  ]
  for (const [clave, valor] of entradas) {
    if (valor?.trim()) salida[clave] = valor.trim()
  }
  return salida
}

export function construirQueryBusqueda(filtros: FiltrosBusquedaUrl): string {
  const params = new URLSearchParams(filtrosBusquedaAQuery(filtros))
  return params.toString()
}

/** Valor del selector que representa «Todos los periodos» (no viaja en la URL). */
export const PERIODO_TODOS = 'todos'

export const RUTA_BUSQUEDA_ADMIN = '/administrador/busqueda'

/**
 * R-008.2b: la URL determina la vista. Sin `periodo` se consultan todos los periodos;
 * el periodo actual solo se aplica cuando viaja explícito en la URL (enlaces de entrada).
 */
export function rutaBusquedaConPeriodoActual(
  base = RUTA_BUSQUEDA_ADMIN,
  fecha = new Date(),
): string {
  return `${base}?${new URLSearchParams({ periodo: periodoAcademicoActual(fecha) })}`
}
