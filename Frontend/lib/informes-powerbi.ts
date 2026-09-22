export interface InformePowerBi {
  id: string
  titulo: string
  descripcion: string
  valor: number
  urlImagen?: string
  gradienteDesde: string
  gradienteHasta: string
  reportId?: string
}

const IMAGEN_CATEGORIA = '/imagenes/siac/placeholder-categoria.svg'

export const informesPowerBiSemilla: InformePowerBi[] = [
  {
    id: 'estudiantes',
    titulo: 'Estudiantes',
    descripcion: 'Selección y permanencia',
    valor: 4.2,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#1D70B8',
  },
  {
    id: 'profesores',
    titulo: 'Profesores',
    descripcion: 'Formación y experiencia',
    valor: 4.5,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#0A3B74',
  },
  {
    id: 'investigacion',
    titulo: 'Investigación',
    descripcion: 'Grupos y productos',
    valor: 3.8,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#904179',
    gradienteHasta: '#D82B5A',
  },
  {
    id: 'relaciones-entorno',
    titulo: 'Relaciones entorno',
    descripcion: 'Vinculación externa',
    valor: 4.0,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#C28B10',
    gradienteHasta: '#F25C30',
  },
  {
    id: 'bienestar',
    titulo: 'Bienestar',
    descripcion: 'Modelo institucional',
    valor: 4.3,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1D70B8',
    gradienteHasta: '#1CBCA6',
  },
  {
    id: 'egresados',
    titulo: 'Egresados',
    descripcion: 'Seguimiento y empleabilidad',
    valor: 3.9,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#0A3B74',
    gradienteHasta: '#904179',
  },
  {
    id: 'infraestructura',
    titulo: 'Infraestructura',
    descripcion: 'Medios educativos',
    valor: 4.1,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#1CBCA6',
    gradienteHasta: '#C28B10',
  },
  {
    id: 'aseguramiento',
    titulo: 'Aseguramiento',
    descripcion: 'SIAC y autoevaluación',
    valor: 4.4,
    urlImagen: IMAGEN_CATEGORIA,
    gradienteDesde: '#D82B5A',
    gradienteHasta: '#0A3B74',
  },
]
