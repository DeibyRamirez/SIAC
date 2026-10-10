import type { Programa } from '@/lib/tipos'

/** Promedio igualitario del avance de programas activos (fallback sin API). */
export function promedioAvanceProgramasActivos(programas: Programa[]): number {
  const activos = programas.filter((p) => p.activo !== false)
  if (activos.length === 0) return 0
  const suma = activos.reduce((acc, p) => acc + p.porcentajeAvance, 0)
  return Math.round(suma / activos.length)
}
