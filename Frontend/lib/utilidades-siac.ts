import type { EstadoEvidencia, Evidencia, Programa, ResumenProgramaEvidencia } from '@/lib/tipos'

type EvidenciaApi = Partial<Evidencia> & {
  programaId?: string | null
  programa?: ResumenProgramaEvidencia | null
  fechaCarga?: string | Date
  createdAt?: string | Date
}
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

function normalizarFechaCargaApi(
  fechaCarga?: string | Date,
  createdAt?: string | Date,
): string {
  const candidato = fechaCarga ?? createdAt
  if (!candidato) return new Date().toISOString()
  if (candidato instanceof Date) return candidato.toISOString()
  return candidato
}

/** Mapea la respuesta de GET/POST evidencias conservando programa anidado y timestamp. */
export function mapearEvidenciaDesdeApi(e: EvidenciaApi): Evidencia {
  const programa = e.programa ?? undefined
  const programaId = e.programaId ?? programa?.id ?? ''

  return {
    id: e.id!,
    nombre: e.nombre!,
    programaId,
    programa,
    periodo: e.periodo!,
    codigoGuia: e.codigoGuia,
    requiereChecklistMaestro: e.requiereChecklistMaestro,
    puntajeActual: e.puntajeActual,
    totalCondicionesActual: e.totalCondicionesActual,
    estado: e.estado!,
    autorId: e.autorId!,
    nombreArchivo: e.nombreArchivo!,
    fechaCarga: normalizarFechaCargaApi(e.fechaCarga, e.createdAt),
    observaciones: e.observaciones,
    responsable: e.responsable,
    version: e.version,
    documentoRequeridoId: e.documentoRequeridoId,
  }
}

/** Resuelve el nombre contra los programas cargados desde la API (`datos.programas` del almacén). */
export function obtenerNombrePrograma(
  id: string,
  programas: ReadonlyArray<Pick<Programa, 'id' | 'nombre'>>,
): string {
  if (!id) return 'Institución'
  return programas.find((programa) => programa.id === id)?.nombre ?? 'Programa no disponible'
}

/** Nombre de programa para tablas: usa el objeto anidado de la API o el catálogo local. */
export function obtenerNombreProgramaEvidencia(
  evidencia: Pick<Evidencia, 'programaId' | 'programa' | 'codigoGuia'>,
  programas: ReadonlyArray<Pick<Programa, 'id' | 'nombre'>>,
): string {
  if (evidencia.programa?.nombre) return evidencia.programa.nombre
  if (evidencia.programaId) {
    return obtenerNombrePrograma(evidencia.programaId, programas)
  }
  if (evidencia.codigoGuia === 'G3' || evidencia.codigoGuia === 'G4') {
    return 'Institución'
  }
  return 'Programa no disponible'
}

/** Opciones `{ value, label }` para Base UI Select cuando el value es el id (o slug) del programa. */
export function itemsSelectProgramas(
  programas: ReadonlyArray<Pick<Programa, 'id' | 'nombre' | 'nivel' | 'slug'>>,
  opciones?: { incluirNivel?: boolean; usarSlug?: boolean },
): { value: string; label: string }[] {
  const incluirNivel = opciones?.incluirNivel ?? false
  const usarSlug = opciones?.usarSlug ?? false
  return programas.map((programa) => ({
    value: usarSlug ? (programa.slug ?? programa.id) : programa.id,
    label: incluirNivel
      ? `${programa.nombre} (${programa.nivel})`
      : programa.nombre,
  }))
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

/** Formato para VisorDocumentoInline (previsualización DOCX vía API). */
export function formatoVisorDesdeArchivo(nombreArchivo: string): 'PDF' | 'DOCX' | 'XLSX' {
  const ext = nombreArchivo.split('.').pop()?.toLowerCase()
  if (ext === 'docx') return 'DOCX'
  if (ext === 'xlsx' || ext === 'xls') return 'XLSX'
  return 'PDF'
}

export function manejarCambioSelect(
  actualizar: (valor: string) => void,
): (valor: string | null) => void {
  return (valor) => {
    if (valor != null) actualizar(valor)
  }
}
