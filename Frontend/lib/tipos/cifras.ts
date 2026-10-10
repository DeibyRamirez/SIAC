export type FuenteCifras = 'Semilla' | 'BaseDatos' | 'ApiInstitucional'

export type FormatoIndicador = 'entero' | 'porcentaje' | 'decimal' | 'texto'

export type TipoSerieCifras = 'linea' | 'barra' | 'donut'

export interface PuntoSerieCifras {
  etiqueta: string
  valor: number
}

export interface IndicadorCifras {
  id: string
  etiqueta: string
  valor: number | string
  unidad: string
  formato: FormatoIndicador
}

export interface SerieCifras {
  id: string
  tipo: TipoSerieCifras
  titulo: string
  subtitulo?: string
  puntos: PuntoSerieCifras[]
}

export interface MetaCifras {
  categoriaId: string
  titulo: string
  periodo: string
  actualizadoEn: string
  fuente: FuenteCifras
}

export interface FiltrosDisponiblesCifras {
  periodos: string[]
  programaId?: string
}

export interface RespuestaCifras {
  meta: MetaCifras
  indicadores: IndicadorCifras[]
  series: SerieCifras[]
  filtrosDisponibles?: FiltrosDisponiblesCifras
}

export interface CategoriaCifras {
  id: string
  titulo: string
  descripcion: string
  disponible: boolean
}

export interface RespuestaEmbedPowerBi {
  embedUrl: string
  embedToken: string | null
  reportId: string
  categoriaId: string | null
  fallback: boolean
  mensaje?: string
}
