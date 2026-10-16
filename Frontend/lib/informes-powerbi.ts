/**
 * Catálogo tipado de informes Power BI (HU-009, T-009.3).
 *
 * Las URL públicas («Publicar en la web») se almacenan en `ConfiguracionInformePowerBi`
 * y se consultan vía API (`lib/servicios/powerbi.servicio.ts`).
 */

/** Identificadores de categoría; coinciden con `categoriaId` del backend. */
export type CategoriaIdPowerBi =
  | 'aseguramiento'
  | 'infraestructura'
  | 'egresados'
  | 'investigacion'
  | 'profesores'
  | 'estudiantes'
  | 'bienestar'
  | 'relaciones-entorno'

export interface InformePowerBi {
  id: CategoriaIdPowerBi
  titulo: string
  descripcion: string
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
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#D82B5A',
    gradienteHasta: '#0A3B74',
  },
  {
    id: 'infraestructura',
    titulo: 'Infraestructura',
    descripcion: 'Medios educativos',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#C28B10',
  },
  {
    id: 'egresados',
    titulo: 'Egresados',
    descripcion: 'Seguimiento y empleabilidad',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#904179',
  },
  {
    id: 'investigacion',
    titulo: 'Investigación',
    descripcion: 'Grupos y productos',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#904179',
    gradienteHasta: '#D82B5A',
  },
  {
    id: 'profesores',
    titulo: 'Profesores',
    descripcion: 'Formación y experiencia',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#0A3B74',
  },
  {
    id: 'estudiantes',
    titulo: 'Estudiantes',
    descripcion: 'Selección y permanencia',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#1D70B8',
  },
  {
    id: 'bienestar',
    titulo: 'Bienestar',
    descripcion: 'Servicios, apoyos y permanencia',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#904179',
  },
  {
    id: 'relaciones-entorno',
    titulo: 'Relaciones con el entorno',
    descripcion: 'Extensión, convenios y movilidad',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#C28B10',
    gradienteHasta: '#0A3B74',
  },
]

export function buscarCategoriaPowerBi(id: string): InformePowerBi | undefined {
  return categoriasInformesPowerBi.find((categoria) => categoria.id === id)
}
