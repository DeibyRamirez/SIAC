export const CATEGORIAS_CIFRAS = [
  'estudiantes',
  'profesores',
  'egresados',
  'investigacion',
  'aseguramiento',
  'infraestructura',
  'bienestar',
  'relaciones-entorno',
] as const;

export type CategoriaCifras = (typeof CATEGORIAS_CIFRAS)[number];

export const REGEX_PERIODO_CIFRAS = /^\d{4}(-[12])?$/;
export const MAXIMO_FILAS_ENVIO = 5000;
export const TAMANO_LOTE_INSERCION = 1000;
export const PREFIJO_CLAVE_INTEGRACION = 'siac_live_';

export function esCategoriaCifras(valor: string): valor is CategoriaCifras {
  return (CATEGORIAS_CIFRAS as readonly string[]).includes(valor);
}

export function mensajePeriodoInvalido(): string {
  return 'El periodo debe tener formato AAAA-S (ej. 2026-1) o AAAA.';
}
