import type { EstadoEvidencia, Programa } from '@/lib/tipos'
import { programasSemilla } from '@/lib/datos-semilla'

const etiquetasEstado: Record<EstadoEvidencia, string> = {
  Borrador: 'Borrador',
  EnRevision: 'Pendiente de verificación',
  ConObservaciones: 'Con observaciones',
  Cumple: 'Cumple',
  Validado: 'Validado',
  Rechazado: 'Rechazado',
}

/** Texto "n/total" del puntaje del checklist; null si el documento no tiene verificación. */
export function formatearPuntaje(
  puntaje: number | null | undefined,
  totalCondiciones: number | null | undefined,
): string | null {
  if (puntaje === null || puntaje === undefined || !totalCondiciones) return null
  return `${puntaje}/${totalCondiciones}`
}

/** Estados desde los que el Cargador corrige y reenvía a revisión. */
export function admiteCorreccion(estado: EstadoEvidencia): boolean {
  return estado === 'Borrador' || estado === 'ConObservaciones' || estado === 'Rechazado'
}

export function obtenerProgramaPorId(id: string): Programa | undefined {
  return programasSemilla.find((programa) => programa.id === id)
}

export function obtenerNombrePrograma(id: string): string {
  return obtenerProgramaPorId(id)?.nombre ?? 'Institucional'
}

/**
 * HU-010: nombre del propietario de una evidencia. Los documentos G3/G4 pertenecen a la
 * institución (CUAC) y no a una carrera.
 */
export function obtenerNombrePropietario(evidencia: {
  programaId?: string | null
  institucionId?: string | null
  programa?: { nombre: string } | null
  institucion?: { nombre: string; sigla: string } | null
}): string {
  if (evidencia.institucionId || evidencia.institucion) {
    return evidencia.institucion
      ? `Institución · ${evidencia.institucion.sigla}`
      : 'Institución'
  }
  if (evidencia.programa?.nombre) return evidencia.programa.nombre
  return evidencia.programaId ? obtenerNombrePrograma(evidencia.programaId) : 'Sin programa'
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
  return evidencia.estado === 'ConObservaciones' || evidencia.estado === 'Rechazado'
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
