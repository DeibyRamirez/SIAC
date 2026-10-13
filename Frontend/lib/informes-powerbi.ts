/**
 * Catálogo tipado de informes Power BI (HU-009, T-009.3).
 *
 * Cada categoría se publica en Power BI con datos de Unicauca y su URL pública
 * («Publicar en la web») vive en una variable de entorno propia del frontend.
 * Las URL nunca se escriben en el código: ver `lib/powerbi/configuracion-powerbi.ts`.
 */

/** Identificadores de categoría; coinciden con `categoriaId` del backend. */
export type CategoriaIdPowerBi =
  | 'aseguramiento'
  | 'infraestructura'
  | 'egresados'
  | 'investigacion'
  | 'profesores'
  | 'estudiantes'

/** Nombres de las variables de entorno con la URL pública de cada informe. */
export type VariableEntornoPowerBi =
  | 'NEXT_PUBLIC_POWERBI_URL_ASEGURAMIENTO'
  | 'NEXT_PUBLIC_POWERBI_URL_INFRAESTRUCTURA'
  | 'NEXT_PUBLIC_POWERBI_URL_EGRESADOS'
  | 'NEXT_PUBLIC_POWERBI_URL_INVESTIGACION'
  | 'NEXT_PUBLIC_POWERBI_URL_PROFESORES'
  | 'NEXT_PUBLIC_POWERBI_URL_ESTUDIANTES'

export interface InformePowerBi {
  id: CategoriaIdPowerBi
  titulo: string
  descripcion: string
  /** Variable de entorno que contiene la URL de «Publicar en la web». */
  variableEntorno: VariableEntornoPowerBi
  /** Hay un respaldo nativo (panel de cifras en Recharts) cuando el informe no está disponible. */
  tieneRespaldoRecharts: boolean
  urlImagen?: string
  gradienteDesde: string
  gradienteHasta: string
}

const IMAGEN_CATEGORIA = '/imagenes/siac/placeholder-categoria.svg'

export const categoriasInformesPowerBi: readonly InformePowerBi[] = [
  {
    id: 'aseguramiento',
    titulo: 'Aseguramiento',
    descripcion: 'SIAC y autoevaluación',
    variableEntorno: 'NEXT_PUBLIC_POWERBI_URL_ASEGURAMIENTO',
    tieneRespaldoRecharts: true,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#D82B5A',
    gradienteHasta: '#0A3B74',
  },
  {
    id: 'infraestructura',
    titulo: 'Infraestructura',
    descripcion: 'Medios educativos',
    variableEntorno: 'NEXT_PUBLIC_POWERBI_URL_INFRAESTRUCTURA',
    tieneRespaldoRecharts: true,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#C28B10',
  },
  {
    id: 'egresados',
    titulo: 'Egresados',
    descripcion: 'Seguimiento y empleabilidad',
    variableEntorno: 'NEXT_PUBLIC_POWERBI_URL_EGRESADOS',
    tieneRespaldoRecharts: true,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#904179',
  },
  {
    id: 'investigacion',
    titulo: 'Investigación',
    descripcion: 'Grupos y productos',
    variableEntorno: 'NEXT_PUBLIC_POWERBI_URL_INVESTIGACION',
    tieneRespaldoRecharts: true,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#904179',
    gradienteHasta: '#D82B5A',
  },
  {
    id: 'profesores',
    titulo: 'Profesores',
    descripcion: 'Formación y experiencia',
    variableEntorno: 'NEXT_PUBLIC_POWERBI_URL_PROFESORES',
    tieneRespaldoRecharts: true,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#0A3B74',
  },
  {
    id: 'estudiantes',
    titulo: 'Estudiantes',
    descripcion: 'Selección y permanencia',
    variableEntorno: 'NEXT_PUBLIC_POWERBI_URL_ESTUDIANTES',
    tieneRespaldoRecharts: true,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#1D70B8',
  },
]

export function buscarCategoriaPowerBi(id: string): InformePowerBi | undefined {
  return categoriasInformesPowerBi.find((categoria) => categoria.id === id)
}
