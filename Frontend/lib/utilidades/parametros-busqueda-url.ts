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
