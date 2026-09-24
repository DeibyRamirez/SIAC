export function totalPaginas(total: number, limite: number): number {
  if (limite <= 0) return 1
  return Math.max(1, Math.ceil(total / limite))
}

export function paginarArreglo<T>(items: T[], pagina: number, limite: number): T[] {
  const paginaSegura = Math.max(1, pagina)
  const inicio = (paginaSegura - 1) * limite
  return items.slice(inicio, inicio + limite)
}
