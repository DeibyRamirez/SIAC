export const PROPIEDAD_FIRMA_SIAC = 'SIAC_FIRMA_VERSION';

export type TipoLineaDiff = 'contexto' | 'agregado' | 'eliminado';

export interface LineaDiff {
  tipo: TipoLineaDiff;
  texto: string;
  numeroAntes: number | null;
  numeroDespues: number | null;
}

export interface HunkDiff {
  id: string;
  encabezado: string;
  /** Índice de la primera línea del hunk dentro del arreglo completo `lineas`. */
  indiceInicio: number;
  lineas: LineaDiff[];
  agregadas: number;
  eliminadas: number;
}

export type EstadoMediaDiff =
  | 'agregado'
  | 'eliminado'
  | 'modificado'
  | 'sinCambios';

export interface MediaDiff {
  part: string;
  estado: EstadoMediaDiff;
  hashAntes?: string;
  hashDespues?: string;
  tamanoAntes?: number;
  tamanoDespues?: number;
}

export interface ResultadoDiffDocx {
  agregadas: number;
  eliminadas: number;
  sinCambios: boolean;
  /** Secuencia completa (documento con marcas): contexto + eliminado + agregado. */
  lineas: LineaDiff[];
  hunks: HunkDiff[];
  media: MediaDiff[];
}

export interface ComentarioDocxEntrada {
  id: number;
  autor: string;
  fechaIso: string;
  texto: string;
}

export interface ZonaCorreccionEntrada {
  codigoCondicion: string;
  etiqueta: string;
  observacion: string;
  idPermiso: number;
}

export interface ResultadoProcesamientoDocx {
  buffer: Buffer;
  firmaDescarga: string;
  textoBaseAuditoria: string;
}

export interface ComentarioWordEntrada {
  quote: string;
  body: string;
  autor?: string;
  /** Fecha del comentario (dictamen); se escribe en w:date con offset Bogotá. */
  fecha?: string | Date;
}

export interface ResultadoInyeccionComentarios {
  buffer: Buffer;
  inyectados: number;
  omitidos: number;
}
