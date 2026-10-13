import type {
  DesgloseCifra,
  FuenteCifras,
  IndicadorCifras,
  PuntoSerieCifras,
} from '@/lib/tipos/cifras'

const ETIQUETAS_FUENTE: Record<FuenteCifras, string> = {
  API: 'API',
  EXCEL: 'Excel',
  SEMILLA: 'Semilla',
  MIXTA: 'Mixta',
}

const VARIANTES_FUENTE: Record<FuenteCifras, 'cyan' | 'esmeralda' | 'ocre' | 'purpura'> = {
  API: 'cyan',
  EXCEL: 'esmeralda',
  SEMILLA: 'ocre',
  MIXTA: 'purpura',
}

export function etiquetaFuente(fuente: FuenteCifras): string {
  return ETIQUETAS_FUENTE[fuente] ?? fuente
}

export function varianteFuente(fuente: FuenteCifras): 'cyan' | 'esmeralda' | 'ocre' | 'purpura' {
  return VARIANTES_FUENTE[fuente] ?? 'cyan'
}

/** Fecha de última actualización en zona horaria de Bogotá; «—» si viene vacía o inválida. */
export function formatearActualizadoBogota(iso: string | undefined): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(fecha)
}

export function formatearValorIndicador(indicador: IndicadorCifras): string {
  const valor = indicador.total ?? indicador.valor
  if (typeof valor !== 'number') return String(valor ?? '—')
  switch (indicador.formato) {
    case 'porcentaje':
      return `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
    case 'decimal':
      return valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })
    case 'entero':
      return valor.toLocaleString('es-CO')
    default:
      return String(valor)
  }
}

export interface GrupoDesglose {
  dimension: string
  puntos: PuntoSerieCifras[]
}

/** Agrupa el desglose por dimensión; «facultad» es la dimensión implícita cuando solo hay facultad. */
export function agruparDesglose(desglose: DesgloseCifra[] | undefined): GrupoDesglose[] {
  if (!desglose?.length) return []

  const grupos = new Map<string, PuntoSerieCifras[]>()
  for (const fila of desglose) {
    if (typeof fila.valor !== 'number') continue
    const dimension = fila.dimension ?? (fila.facultad ? 'facultad' : 'otra')
    const etiqueta = fila.valorDimension ?? fila.facultad ?? 'Sin clasificar'
    const puntos = grupos.get(dimension) ?? []
    const existente = puntos.findIndex((punto) => punto.etiqueta === etiqueta)
    if (existente >= 0) {
      puntos[existente] = { etiqueta, valor: puntos[existente].valor + fila.valor }
    } else {
      puntos.push({ etiqueta, valor: fila.valor })
    }
    grupos.set(dimension, puntos)
  }

  return Array.from(grupos.entries()).map(([dimension, puntos]) => ({ dimension, puntos }))
}

const ETIQUETAS_DIMENSION: Record<string, string> = {
  vinculacion: 'Vinculación',
  dedicacion: 'Dedicación',
  escalafon: 'Escalafón',
  genero: 'Género',
  estrato: 'Estrato',
  departamento: 'Procedencia',
  tipo: 'Tipo',
  nivel: 'Nivel',
  clasificacion: 'Clasificación',
  servicio: 'Servicio',
  sentido: 'Sentido',
  anio: 'Año',
  semestre: 'Semestre',
  periodo: 'Periodo',
  facultad: 'Facultad',
  grupo: 'Grupo',
}

export function etiquetaDimension(dimension: string): string {
  const normalizada = dimension.trim().toLowerCase()
  if (ETIQUETAS_DIMENSION[normalizada]) return ETIQUETAS_DIMENSION[normalizada]
  return normalizada.charAt(0).toUpperCase() + normalizada.slice(1)
}

export type TipoGraficoCifras = 'linea' | 'dona' | 'barras'

/**
 * Línea para dimensiones temporales; dona para conteos pequeños (≤6 valores);
 * barras para el resto.
 */
export function tipoGraficoCifras(
  dimension: string,
  unidad: string,
  cantidadPuntos: number,
): TipoGraficoCifras {
  const normalizada = dimension
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (['periodo', 'anio', 'semestre'].includes(normalizada)) return 'linea'
  if (unidad === 'conteo' && cantidadPuntos <= 6) return 'dona'
  return 'barras'
}
