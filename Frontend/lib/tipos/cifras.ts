export type FuenteCifras = 'API' | 'EXCEL' | 'SEMILLA' | 'MIXTA'

export type FormatoIndicador = 'entero' | 'porcentaje' | 'decimal' | 'texto'

export type TipoSerieCifras = 'linea' | 'barra' | 'donut'

export interface PuntoSerieCifras {
  etiqueta: string
  valor: number
}

export interface DesgloseCifra {
  dimension?: string
  valorDimension?: string
  facultad?: string
  valor: number
}

export interface IndicadorCifras {
  id: string
  etiqueta: string
  valor: number | string
  unidad: string
  formato: FormatoIndicador
  clave?: string
  total?: number
  fuente?: FuenteCifras
  desglose?: DesgloseCifra[]
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
  /** true cuando la categoría tiene datos en el periodo pero los filtros dejan 0. */
  sinCoincidencias?: boolean
}

export interface FiltrosDisponiblesCifras {
  periodos: string[]
  programaId?: string
}

export interface RespuestaCifras {
  meta: MetaCifras
  indicadores: IndicadorCifras[]
  series: SerieCifras[]
  periodosDisponibles?: string[]
  filtrosDisponibles?: FiltrosDisponiblesCifras
}

export interface VariableCifraResumen {
  clave: string
  etiquetaCuac: string
  descripcion?: string
  unidad: string
  dimensiones: string[]
}

export interface VariableCifra extends VariableCifraResumen {
  id: string
  categoriaId: string
  activo: boolean
  actualizadoEn: string
}

export type TipoColumnaEsquemaCifras =
  | 'texto'
  | 'periodo'
  | 'codigo'
  | 'fecha'
  | 'entero'
  | 'decimal'
  | 'enum'

export interface ColumnaEsquemaCifras {
  encabezado: string
  clave: string
  tipo: TipoColumnaEsquemaCifras
  obligatoria: boolean
  enum?: string[]
  descripcion?: string
}

export interface CategoriaCifras {
  id: string
  titulo: string
  descripcion: string
  disponible: boolean
  variables?: VariableCifraResumen[]
  /** Columnas del esquema tipado para las categorías cargadas por registros (S3-03). */
  esquema?: ColumnaEsquemaCifras[]
}

export interface FiltrosCifrasCategoria {
  periodo?: string
  facultad?: string
  programaId?: string
  /** Nombre del programa en los registros (opciones reales del panel). */
  programa?: string
  sede?: string
}

export interface RespuestaFiltrosCifras {
  periodos: string[]
  facultades: string[]
  programas: string[]
  sedes: string[]
}

export interface ErrorFilaImportacionCifras {
  fila: number
  columna?: string
  mensaje: string
}

export interface ResultadoImportacionCifras {
  filasOk: number
  filasError: number
  errores: ErrorFilaImportacionCifras[]
  fuente: FuenteCifras
  periodosReemplazados?: string[]
}

export interface PlantillaJsonCifras {
  categoriaId: string
  titulo?: string
  registros: Array<Record<string, unknown>>
}

export interface RespuestaEmbedPowerBi {
  embedUrl: string
  embedToken: string | null
  reportId: string
  categoriaId: string | null
  fallback: boolean
  mensaje?: string
}
