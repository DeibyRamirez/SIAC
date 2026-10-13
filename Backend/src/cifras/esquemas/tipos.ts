/**
 * S3-03 / HU-009: catálogo tipado de columnas por categoría.
 * Es la única fuente de verdad del formato (no se lee docs/plantillas-siac.xlsx en runtime):
 * de aquí salen validación, plantilla Excel, ejemplo JSON, Swagger y el diccionario.
 */

export type TipoColumnaCifras =
  | 'texto'
  | 'periodo'
  | 'codigo'
  | 'fecha'
  | 'entero'
  | 'decimal'
  | 'enum';

export interface ColumnaEsquemaCifras {
  /** Encabezado visible/corregido de la plantilla (ej. «facultad» en vez de «falcultad»). */
  encabezado: string;
  /** Clave normalizada usada en JSON, respuestas y feed (ej. «periodo_academico»). */
  clave: string;
  tipo: TipoColumnaCifras;
  obligatoria: boolean;
  /** Valores permitidos cuando el tipo es enum. */
  enum?: readonly string[];
  min?: number;
  max?: number;
  /** Encabezados alternos aceptados (errores de digitación conocidos de la fuente real). */
  alias?: readonly string[];
  descripcion?: string;
  ejemplo?: string | number;
  /** Bandera 0|1: la suma de las banderas de una fila debe ser exactamente 1. */
  bandera?: boolean;
  /** Columna presente por compatibilidad: se acepta pero no se valida ni se guarda. */
  deprecada?: boolean;
  /** Dato personal (Ley 1581): nunca se expone en lecturas agregadas ni en el feed. */
  personal?: boolean;
  /** Campo del modelo Prisma asociado (para repositorio y feed). */
  campoPrisma?: string;
}

export interface EsquemaCategoriaCifras {
  categoriaId: string;
  /** Nombre de la hoja Excel (igual a la categoría). */
  hoja: string;
  titulo: string;
  /** Clave que se reemplaza al reimportar: periodo académico, periodo de graduación o sede. */
  claveReemplazo: string;
  columnas: readonly ColumnaEsquemaCifras[];
}

export function columnasRequeridas(esquema: EsquemaCategoriaCifras): ColumnaEsquemaCifras[] {
  return esquema.columnas.filter((columna) => columna.obligatoria && !columna.deprecada);
}

export function columnasPersistidas(esquema: EsquemaCategoriaCifras): ColumnaEsquemaCifras[] {
  return esquema.columnas.filter((columna) => !columna.deprecada);
}
