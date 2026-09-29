import { CodigoCondicionInstitucional } from '@prisma/client';

export const TOTAL_CONDICIONES_INSTITUCIONALES = 6;

export interface DefinicionCondicionInstitucional {
  codigo: CodigoCondicionInstitucional;
  etiqueta: string;
  articulo: string;
}

export const CONDICIONES_INSTITUCIONALES: DefinicionCondicionInstitucional[] = [
  {
    codigo: CodigoCondicionInstitucional.SeleccionEvaluacionEstudiantesProfesores,
    etiqueta:
      'Mecanismos de selección y evaluación de estudiantes y profesores',
    articulo: 'Art. 2.5.3.2.3.1.2',
  },
  {
    codigo: CodigoCondicionInstitucional.EstructuraAdministrativaAcademica,
    etiqueta: 'Estructura administrativa y académica',
    articulo: 'Art. 2.5.3.2.3.1.3',
  },
  {
    codigo: CodigoCondicionInstitucional.CulturaAutoevaluacion,
    etiqueta: 'Cultura de la autoevaluación',
    articulo: 'Art. 2.5.3.2.3.1.4',
  },
  {
    codigo: CodigoCondicionInstitucional.ProgramaEgresados,
    etiqueta: 'Programa de egresados',
    articulo: 'Art. 2.5.3.2.3.1.5',
  },
  {
    codigo: CodigoCondicionInstitucional.ModeloBienestar,
    etiqueta: 'Modelo de bienestar',
    articulo: 'Art. 2.5.3.2.3.1.6',
  },
  {
    codigo: CodigoCondicionInstitucional.RecursosSuficientes,
    etiqueta: 'Recursos suficientes',
    articulo: 'Art. 2.5.3.2.3.1.7',
  },
];

export const CODIGOS_CONDICION_INSTITUCIONAL =
  CONDICIONES_INSTITUCIONALES.map((c) => c.codigo);

export function etiquetaCondicionInstitucional(
  codigo: CodigoCondicionInstitucional,
): string {
  return (
    CONDICIONES_INSTITUCIONALES.find((c) => c.codigo === codigo)?.etiqueta ??
    codigo
  );
}
