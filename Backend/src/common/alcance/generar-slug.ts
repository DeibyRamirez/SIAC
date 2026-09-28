/** Slug público del programa: sin tildes y en kebab-case (p. ej. «Derecho» → derecho). */
export function generarSlug(texto: string): string {
  const base = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'programa';
}
