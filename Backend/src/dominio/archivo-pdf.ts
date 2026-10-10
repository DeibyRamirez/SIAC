import { extname } from 'path';

/** Límite de tamaño de la resolución MEN: el mismo de las evidencias (20 MB). */
export const TAMANO_MAXIMO_RESOLUCION = 20 * 1024 * 1024;

const FIRMA_PDF = Buffer.from('%PDF-', 'ascii');

/**
 * Valida que el archivo sea un PDF real: extensión .pdf, MIME application/pdf y firma «%PDF-»
 * en los primeros bytes (un .docx renombrado o un PDF falso se rechazan). Devuelve el motivo
 * del rechazo o null si es válido. La resolución MEN es la única excepción a la regla .docx.
 */
export function motivoRechazoPdf(archivo: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): string | null {
  if (extname(archivo.originalname).toLowerCase() !== '.pdf') {
    return 'La resolución MEN debe ser un archivo .pdf.';
  }
  if (archivo.mimetype !== 'application/pdf') {
    return `Tipo de archivo no permitido (${archivo.mimetype || 'desconocido'}): la resolución MEN debe ser application/pdf.`;
  }
  if (archivo.size > TAMANO_MAXIMO_RESOLUCION || archivo.buffer.length > TAMANO_MAXIMO_RESOLUCION) {
    return 'La resolución MEN supera el tamaño máximo de 20 MB.';
  }
  if (archivo.buffer.length < FIRMA_PDF.length || !archivo.buffer.subarray(0, 1024).includes(FIRMA_PDF)) {
    return 'El archivo no es un PDF válido (no tiene la firma %PDF).';
  }
  return null;
}
