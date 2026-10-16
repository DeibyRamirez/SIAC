/** Identificadores alineados con el catálogo del frontend (`lib/informes-powerbi.ts`). */
export const CATEGORIAS_INFORME_POWERBI = [
  'aseguramiento',
  'infraestructura',
  'egresados',
  'investigacion',
  'profesores',
  'estudiantes',
  'bienestar',
  'relaciones-entorno',
] as const;

export type CategoriaInformePowerBi = (typeof CATEGORIAS_INFORME_POWERBI)[number];

export function esCategoriaInformePowerBi(valor: string): valor is CategoriaInformePowerBi {
  return (CATEGORIAS_INFORME_POWERBI as readonly string[]).includes(valor);
}
