import { extname, basename } from 'path';

/**
 * Multer/Busboy suele interpretar el nombre multipart como latin1;
 * esto recupera UTF-8 (ej. Contratación en lugar de ContrataciÃ³n).
 */
export function decodificarNombreArchivoMultipart(nombre: string): string {
  if (!nombre) return 'archivo';
  const tieneMojibake = /Ã.|Â./.test(nombre);
  if (!tieneMojibake) return nombre.trim();
  try {
    return Buffer.from(nombre, 'latin1').toString('utf8').trim();
  } catch {
    return nombre.trim();
  }
}

/**
 * Segmento seguro para claves S3 en Supabase: ASCII, sin espacios ni tildes.
 */
export function sanitizarSegmentoClaveS3(nombreArchivo: string): string {
  const legible = decodificarNombreArchivoMultipart(nombreArchivo);
  const extension = extname(legible).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const baseSinExt = basename(legible, extname(legible));

  let base = baseSinExt
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');

  if (!base) {
    base = 'archivo';
  }

  const extFinal = extension && extension.startsWith('.') ? extension : extension ? `.${extension}` : '';
  return `${base}${extFinal || '.bin'}`;
}
