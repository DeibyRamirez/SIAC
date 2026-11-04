export type TipoColumnaCifras =
  | 'texto'
  | 'periodo'
  | 'codigo'
  | 'fecha'
  | 'entero'
  | 'decimal'
  | 'enum';

export interface ColumnaEsquemaCifras {
  encabezado: string;
  clave: string;
  tipo: TipoColumnaCifras;
  obligatoria: boolean;
  enum?: readonly string[];
  min?: number;
  max?: number;
  /** Encabezados o claves alternas (erratas de la plantilla, como «falcultad»). */
  alias?: readonly string[];
  /** Tope de caracteres para texto y código. */
  maxCaracteres?: number;
  /** Bandera 0|1. La suma de las banderas de la fila debe ser 1. */
  bandera?: boolean;
  /** Dato personal: se puede recibir y guardar, y no sale en GET ni en las vistas. */
  personal?: boolean;
  campoPrisma: string;
}

export interface EsquemaCategoriaCifras {
  categoriaId: string;
  hoja: string | null;
  titulo: string;
  /** Clave de reemplazo del lote: periodo académico, periodo de graduación, periodo o sede. */
  claveReemplazo: string;
  columnas: readonly ColumnaEsquemaCifras[];
}

export function columnasPersistidas(esquema: EsquemaCategoriaCifras): ColumnaEsquemaCifras[] {
  return [...esquema.columnas];
}

export function columnasPersonales(esquema: EsquemaCategoriaCifras): ColumnaEsquemaCifras[] {
  return esquema.columnas.filter((columna) => columna.personal);
}
