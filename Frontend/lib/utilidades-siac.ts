import type { EstadoEvidencia, Programa } from '@/lib/tipos'
import { programasSemilla } from '@/lib/datos-semilla'

const etiquetasEstado: Record<EstadoEvidencia, string> = {
  Borrador: 'Borrador',
  EnRevision: 'En revisión',
  Validado: 'Aprobado',
  Rechazado: 'Corrección',
}

export function obtenerProgramaPorId(id: string): Programa | undefined {
  return programasSemilla.find((programa) => programa.id === id)
}

export function obtenerNombrePrograma(id: string): string {
  return obtenerProgramaPorId(id)?.nombre ?? 'Institucional'
}

export function obtenerInicialesPrograma(nombre: string): string {
  return nombre
    .split(' ')
    .map((parte) => parte[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function filtrarEvidenciasValidadas<T extends { estado: string }>(items: T[]): T[] {
  return items.filter((item) => item.estado === 'Validado')
}

const localeFecha = 'es-CO'

function parsearFechaEntrada(fechaIso: string): Date {
  if (fechaIso.includes('T')) {
    return new Date(fechaIso)
  }
  return new Date(`${fechaIso}T00:00:00`)
}

export function formatearFecha(fechaIso: string): string {
  const fecha = parsearFechaEntrada(fechaIso)
  return fecha.toLocaleDateString(localeFecha, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatearSoloHora(fechaIso: string): string {
  const fecha = parsearFechaEntrada(fechaIso)
  return fecha.toLocaleTimeString(localeFecha, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatearFechaHora(fechaIso: string): string {
  const fecha = parsearFechaEntrada(fechaIso)
  return fecha.toLocaleString(localeFecha, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function etiquetaEstadoEvidencia(estado: EstadoEvidencia): string {
  return etiquetasEstado[estado]
}

export function obtenerSaludo(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function contarEvidenciasPendientes(
  evidencias: { estado: EstadoEvidencia }[],
): number {
  return evidencias.filter((e) => e.estado === 'Borrador' || e.estado === 'EnRevision').length
}

export function contarNovedadesCargador(
  evidencias: { estado: EstadoEvidencia; autorId: string; observaciones?: string }[],
  autorId: string,
): number {
  return evidencias.filter(
    (e) => e.autorId === autorId && esNovedadCargador(e),
  ).length
}

export function esNovedadCargador(evidencia: {
  estado: EstadoEvidencia
  observaciones?: string
}): boolean {
  return evidencia.estado === 'Rechazado'
}

export function inferirFormatoArchivo(nombreArchivo: string): 'PDF' | 'XLSX' | 'OTRO' {
  const ext = nombreArchivo.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'PDF'
  if (ext === 'xlsx' || ext === 'xls') return 'XLSX'
  return 'OTRO'
}

export function manejarCambioSelect(
  actualizar: (valor: string) => void,
): (valor: string | null) => void {
  return (valor) => {
    if (valor != null) actualizar(valor)
  }
}
