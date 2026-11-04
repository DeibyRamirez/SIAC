import { ESQUEMA_ASEGURAMIENTO } from './esquema-aseguramiento';
import { ESQUEMA_BIENESTAR, ESQUEMA_RELACIONES_ENTORNO } from './esquema-clave-valor';
import { ESQUEMA_EGRESADOS } from './esquema-egresados';
import { ESQUEMA_ESTUDIANTES } from './esquema-estudiantes';
import { ESQUEMA_INFRAESTRUCTURA } from './esquema-infraestructura';
import { ESQUEMA_INVESTIGACION } from './esquema-investigacion';
import { ESQUEMA_PROFESORES } from './esquema-profesores';
import { EsquemaCategoriaCifras } from './tipos';

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

export const ESQUEMAS_CIFRAS: Record<CategoriaCifras, EsquemaCategoriaCifras> = {
  estudiantes: ESQUEMA_ESTUDIANTES,
  profesores: ESQUEMA_PROFESORES,
  egresados: ESQUEMA_EGRESADOS,
  investigacion: ESQUEMA_INVESTIGACION,
  aseguramiento: ESQUEMA_ASEGURAMIENTO,
  infraestructura: ESQUEMA_INFRAESTRUCTURA,
  bienestar: ESQUEMA_BIENESTAR,
  'relaciones-entorno': ESQUEMA_RELACIONES_ENTORNO,
};

/** Nombre del delegado de Prisma Client para cada categoría. */
export const DELEGADO_PRISMA: Record<CategoriaCifras, string> = {
  estudiantes: 'cifraEstudiante',
  profesores: 'cifraProfesor',
  egresados: 'cifraEgresado',
  investigacion: 'cifraInvestigacion',
  aseguramiento: 'cifraAseguramiento',
  infraestructura: 'cifraInfraestructura',
  bienestar: 'cifraBienestar',
  'relaciones-entorno': 'cifraRelacionEntorno',
};

export function esCategoriaCifras(valor: string): valor is CategoriaCifras {
  return Object.prototype.hasOwnProperty.call(ESQUEMAS_CIFRAS, valor);
}

export function obtenerEsquemaCifras(categoria: string): EsquemaCategoriaCifras | null {
  if (!esCategoriaCifras(categoria)) return null;
  return ESQUEMAS_CIFRAS[categoria];
}
