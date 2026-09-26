export const PROPIEDAD_FIRMA_SIAC = 'SIAC_FIRMA_VERSION';

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
