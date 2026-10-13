/** Normaliza encabezados y claves: camelCase→snake, sin tildes, minúsculas, espacios/guiones→«_».
 *  «²» se mapea a «2» para que «m²» y «m2» coincidan. */
export function normalizarClaveCifras(texto: string): string {
  return texto
    .trim()
    .replace(/([a-z0-9áéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1_$2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/²/g, '2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
