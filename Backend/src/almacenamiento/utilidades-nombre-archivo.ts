import { extname, basename } from 'path';

/**
 * Multer/Busboy suele interpretar el nombre multipart como latin1;
 * esto recupera UTF-8 (ej. Contratación en lugar de ContrataciÃ³n, o «—» en lugar de «â\u0080\u0094»).
 * Solo decodifica si el texto parece bytes UTF-8 leídos como latin1; un nombre ya correcto no cambia.
 */
export function decodificarNombreArchivoMultipart(nombre: string): string {
  if (!nombre) return 'archivo';
  const pareceLatin1 = /[\u0080-\u00ff]/.test(nombre) && !/[^\u0000-\u00ff]/.test(nombre);
  if (!pareceLatin1) return nombre.trim();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(nombre, 'latin1')).trim();
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
