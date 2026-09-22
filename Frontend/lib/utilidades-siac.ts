import type { Programa } from '@/lib/tipos'
import { programasSemilla } from '@/lib/datos-semilla'

export function obtenerProgramaPorId(id: string): Programa | undefined {
  return programasSemilla.find((programa) => programa.id === id)
}

export function obtenerNombrePrograma(id: string): string {
  return obtenerProgramaPorId(id)?.nombre ?? 'Programa no encontrado'
}

export function filtrarEvidenciasValidadas<T extends { estado: string }>(
  items: T[],
): T[] {
  return items.filter((item) => item.estado === 'Validado')
}

export function formatearFecha(fechaIso: string): string {
  const fecha = new Date(`${fechaIso}T00:00:00`)
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
