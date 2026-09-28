export type CodigoCondicionInstitucional =
  | 'SeleccionEvaluacionEstudiantesProfesores'
  | 'EstructuraAdministrativaAcademica'
  | 'CulturaAutoevaluacion'
  | 'ProgramaEgresados'
  | 'ModeloBienestar'
  | 'RecursosSuficientes'

export const TOTAL_CONDICIONES_INSTITUCIONALES = 6

export const PESO_POR_CONDICION_INSTITUCIONAL =
  100 / TOTAL_CONDICIONES_INSTITUCIONALES

export interface DefinicionCondicionInstitucional {
  codigo: CodigoCondicionInstitucional
  etiqueta: string
  articulo: string
}

export const CONDICIONES_INSTITUCIONALES: DefinicionCondicionInstitucional[] = [
  {
    codigo: 'SeleccionEvaluacionEstudiantesProfesores',
    etiqueta:
      'Mecanismos de selección y evaluación de estudiantes y profesores',
    articulo: 'Art. 2.5.3.2.3.1.2',
  },
  {
    codigo: 'EstructuraAdministrativaAcademica',
    etiqueta: 'Estructura administrativa y académica',
    articulo: 'Art. 2.5.3.2.3.1.3',
  },
  {
    codigo: 'CulturaAutoevaluacion',
    etiqueta: 'Cultura de la autoevaluación',
    articulo: 'Art. 2.5.3.2.3.1.4',
  },
  {
    codigo: 'ProgramaEgresados',
    etiqueta: 'Programa de egresados',
    articulo: 'Art. 2.5.3.2.3.1.5',
  },
  {
    codigo: 'ModeloBienestar',
    etiqueta: 'Modelo de bienestar',
    articulo: 'Art. 2.5.3.2.3.1.6',
  },
  {
    codigo: 'RecursosSuficientes',
    etiqueta: 'Recursos suficientes',
    articulo: 'Art. 2.5.3.2.3.1.7',
  },
]

export const CODIGOS_CONDICION_INSTITUCIONAL =
  CONDICIONES_INSTITUCIONALES.map((c) => c.codigo)

export function calcularPorcentajeCondicionesInstitucionales(
  cumplidas: number,
): number {
  if (cumplidas <= 0) return 0
  if (cumplidas >= TOTAL_CONDICIONES_INSTITUCIONALES) return 100
  return Math.round(
    (cumplidas / TOTAL_CONDICIONES_INSTITUCIONALES) * 100,
  )
}

export function etiquetaCondicionInstitucional(
  codigo: CodigoCondicionInstitucional,
): string {
  return (
    CONDICIONES_INSTITUCIONALES.find((c) => c.codigo === codigo)?.etiqueta ??
    codigo
  )
}

export interface EvaluacionCondicionInstitucionalEvidencia {
  codigoCondicion: CodigoCondicionInstitucional
  cumple: boolean
  observacion?: string | null
  numeroRevision?: number
}
