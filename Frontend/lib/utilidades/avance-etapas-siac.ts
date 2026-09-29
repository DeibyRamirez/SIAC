import type {
  CarpetaNormativa,
  DocumentoRequerido,
  EtapaAcreditacion,
  Evidencia,
} from '@/lib/tipos'

export type EstadoEtapaSIAC = 'Completada' | 'EnProgreso' | 'Pendiente' | 'ConObservaciones'

export interface AvanceDocumentoEtapa {
  documentoId: string
  nombre: string
  aceptado: boolean
  /** Con observaciones (checklist n < total) o rechazado por decisión explícita. */
  rechazado: boolean
  /** Avance derivado del puntaje n/total (no se persiste). */
  porcentajeCompletitud: number
}

export interface AvanceEtapaSIAC {
  etapa: EtapaAcreditacion
  totalDocumentos: number
  documentosAceptados: number
  progreso: number
  estado: EstadoEtapaSIAC
  documentos: AvanceDocumentoEtapa[]
}

export interface ResumenAvanceEtapasSIAC {
  etapas: AvanceEtapaSIAC[]
  etapaActual: EtapaAcreditacion | null
  avanceGlobal: number
}

function documentosDeEtapa(
  etapaId: string,
  carpetas: CarpetaNormativa[],
  documentosRequeridos: DocumentoRequerido[],
): DocumentoRequerido[] {
  const carpetasActivas = new Set(
    carpetas.filter((c) => c.etapaId === etapaId && c.activa).map((c) => c.id),
  )
  return documentosRequeridos.filter(
    (doc) => doc.obligatorio && carpetasActivas.has(doc.carpetaId),
  )
}

function evidenciaPorDocumento(
  documentoId: string,
  evidencias: Evidencia[],
): Evidencia | undefined {
  return evidencias.find((e) => e.documentoRequeridoId === documentoId)
}

/**
 * Avance (0-100) de un documento según la regla n/9: Cumple o Validado => 100;
 * con puntaje de una verificación => proporción n/total; sin verificación o rechazado => 0.
 */
export function porcentajeAvanceEvidencia(
  evidencia: Pick<Evidencia, 'estado' | 'puntajeActual' | 'totalCondicionesActual'>,
): number {
  if (evidencia.estado === 'Cumple' || evidencia.estado === 'Validado') return 100
  if (evidencia.estado === 'Rechazado') return 0
  if (
    evidencia.puntajeActual !== null &&
    evidencia.puntajeActual !== undefined &&
    evidencia.totalCondicionesActual
  ) {
    return Math.round((evidencia.puntajeActual / evidencia.totalCondicionesActual) * 100)
  }
  return 0
}

function calcularProgresoEtapa(
  etapa: EtapaAcreditacion,
  carpetas: CarpetaNormativa[],
  documentosRequeridos: DocumentoRequerido[],
  evidencias: Evidencia[],
): Omit<AvanceEtapaSIAC, 'estado'> {
  const docs = documentosDeEtapa(etapa.id, carpetas, documentosRequeridos)
  const documentos: AvanceDocumentoEtapa[] = docs.map((doc) => {
    const evidencia = evidenciaPorDocumento(doc.id, evidencias)
    const porcentajeCompletitud = evidencia ? porcentajeAvanceEvidencia(evidencia) : 0
    return {
      documentoId: doc.id,
      nombre: doc.nombre,
      aceptado: evidencia?.estado === 'Validado' || evidencia?.estado === 'Cumple',
      rechazado:
        evidencia?.estado === 'Rechazado' || evidencia?.estado === 'ConObservaciones',
      porcentajeCompletitud,
    }
  })

  const totalDocumentos = documentos.length
  const documentosAceptados = documentos.filter((d) => d.aceptado).length
  const sumaPorcentajes = documentos.reduce(
    (acc, d) => acc + d.porcentajeCompletitud,
    0,
  )
  const progreso =
    totalDocumentos === 0 ? 0 : Math.round(sumaPorcentajes / totalDocumentos)

  return {
    etapa,
    totalDocumentos,
    documentosAceptados,
    progreso,
    documentos,
  }
}

function etapaEstaCompletada(avance: Omit<AvanceEtapaSIAC, 'estado'>): boolean {
  if (avance.totalDocumentos === 0) return false
  return avance.progreso === 100 && !avance.documentos.some((d) => d.rechazado)
}

function asignarEstados(etapasBase: Omit<AvanceEtapaSIAC, 'estado'>[]): AvanceEtapaSIAC[] {
  let indiceEnProgreso = -1

  for (let i = 0; i < etapasBase.length; i++) {
    const anterioresCompletas = etapasBase.slice(0, i).every(etapaEstaCompletada)
    const actual = etapasBase[i]
    if (anterioresCompletas && !etapaEstaCompletada(actual)) {
      indiceEnProgreso = i
      break
    }
  }

  if (indiceEnProgreso === -1 && etapasBase.length > 0) {
    const todasCompletas = etapasBase.every(etapaEstaCompletada)
    indiceEnProgreso = todasCompletas ? etapasBase.length - 1 : 0
  }

  return etapasBase.map((base, indice) => {
    const tieneRechazados = base.documentos.some((d) => d.rechazado)
    let estado: EstadoEtapaSIAC

    if (tieneRechazados) {
      estado = 'ConObservaciones'
    } else if (etapaEstaCompletada(base)) {
      estado = 'Completada'
    } else if (indice === indiceEnProgreso) {
      estado = 'EnProgreso'
    } else if (indice < indiceEnProgreso) {
      estado = 'Completada'
    } else {
      estado = 'Pendiente'
    }

    return { ...base, estado }
  })
}

export function calcularAvanceEtapasSIAC(input: {
  etapas: EtapaAcreditacion[]
  carpetas: CarpetaNormativa[]
  documentosRequeridos: DocumentoRequerido[]
  evidencias: Evidencia[]
}): ResumenAvanceEtapasSIAC {
  const etapasOrdenadas = [...input.etapas]
    .filter((e) => e.activa)
    .sort((a, b) => a.orden - b.orden)

  const etapasBase = etapasOrdenadas.map((etapa) =>
    calcularProgresoEtapa(
      etapa,
      input.carpetas,
      input.documentosRequeridos,
      input.evidencias,
    ),
  )

  const etapas = asignarEstados(etapasBase)
  const etapaActual =
    etapas.find((e) => e.estado === 'EnProgreso' || e.estado === 'ConObservaciones')?.etapa ??
    etapas.at(-1)?.etapa ??
    null

  const totalDocs = etapas.reduce((sum, e) => sum + e.totalDocumentos, 0)
  const sumaGlobal = etapas.reduce(
    (sum, e) => sum + e.documentos.reduce((s, d) => s + d.porcentajeCompletitud, 0),
    0,
  )
  const avanceGlobal = totalDocs === 0 ? 0 : Math.round(sumaGlobal / totalDocs)

  return { etapas, etapaActual, avanceGlobal }
}

export function etiquetaEstadoEtapa(estado: EstadoEtapaSIAC): string {
  const mapa: Record<EstadoEtapaSIAC, string> = {
    Completada: 'Completada',
    EnProgreso: 'En progreso',
    Pendiente: 'Pendiente',
    ConObservaciones: 'Con observaciones',
  }
  return mapa[estado]
}
