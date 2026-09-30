/** Categorías de informe Power BI (catálogo de navegación; los valores vienen del informe embebido). */
export interface InformePowerBi {
  id: string
  titulo: string
  descripcion: string
  urlImagen?: string
  gradienteDesde: string
  gradienteHasta: string
  reportId?: string
}

const IMAGEN_CATEGORIA = '/imagenes/siac/placeholder-categoria.svg'

export const categoriasInformesPowerBi: InformePowerBi[] = [
  {
    id: 'estudiantes',
    titulo: 'Estudiantes',
    descripcion: 'Selección y permanencia',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#1D70B8',
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
    id: 'investigacion',
    titulo: 'Investigación',
    descripcion: 'Grupos y productos',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#904179',
    gradienteHasta: '#D82B5A',
  },
  {
    id: 'relaciones-entorno',
    titulo: 'Relaciones entorno',
    descripcion: 'Vinculación externa',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#C28B10',
    gradienteHasta: '#F25C30',
  },
  {
    id: 'bienestar',
    titulo: 'Bienestar',
    descripcion: 'Modelo institucional',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1D70B8',
    gradienteHasta: '#1CBCA6',
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
    id: 'infraestructura',
    titulo: 'Infraestructura',
    descripcion: 'Medios educativos',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#C28B10',
  },
  {
    id: 'aseguramiento',
    titulo: 'Aseguramiento',
    descripcion: 'SIAC y autoevaluación',
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#D82B5A',
    gradienteHasta: '#0A3B74',
  },
]
