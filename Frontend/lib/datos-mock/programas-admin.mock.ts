import type { DocumentoPanel, FilaPanelPrograma } from '@/lib/servicios/panel-programas.servicio'
import type { DocumentoProgresoSIAC, ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import type { NivelPrograma, Programa, SemaforoPrograma, SemaforoVigencia } from '@/lib/tipos'
import {
  CATALOGO_TRAMITES_SIAC,
  ETIQUETAS_GUIA,
  type CodigoDocumentoGuia,
  type TipoTramiteSIAC,
} from '@/lib/utilidades/catalogo-tramites-siac'
import {
  calcularPorcentajeVigencia,
  calcularSemaforoVigencia,
} from '@/lib/utilidades/vigencia-registro'

export const ID_INSTITUCION_MOCK = 'institucion-cuac'

const PESOS_TRAMITE: Record<TipoTramiteSIAC, Partial<Record<CodigoDocumentoGuia, number>>> = {
  RegistroCalificadoNuevo: { G1: 100 },
  RenovacionRegistroCalificado: { G1: 90, G2: 10 },
  CondicionesInstitucionalesNuevas: { G3: 100 },
  RenovacionCondicionesInstitucionales: { G3: 85, G4: 15 },
}

export interface EntidadMockAdmin extends Programa {
  alcance: 'Programa' | 'Institucion'
  tipoTramite: TipoTramiteSIAC
  fechaResolucion: string | null
  documentosInternos: Record<CodigoDocumentoGuia, number>
  semaforoAvance: SemaforoPrograma
  semaforoVigencia: SemaforoVigencia
  semaforoGeneral: SemaforoPrograma
}

function calcularAvancePonderado(
  tipoTramite: TipoTramiteSIAC,
  documentosInternos: Record<CodigoDocumentoGuia, number>,
): number {
  const pesos = PESOS_TRAMITE[tipoTramite]
  let total = 0
  for (const [guia, peso] of Object.entries(pesos)) {
    const interno = documentosInternos[guia as CodigoDocumentoGuia] ?? 0
    total += (interno * peso) / 100
  }
  return Math.round(total * 100) / 100
}

function calcularSemaforoAvance(avance: number): SemaforoPrograma {
  if (avance >= 100) return 'Verde'
  if (avance >= 55) return 'Amarillo'
  return 'Rojo'
}

function colorMasCritico(colores: SemaforoPrograma[]): SemaforoPrograma {
  if (colores.includes('Rojo')) return 'Rojo'
  if (colores.includes('Amarillo')) return 'Amarillo'
  return 'Verde'
}

function construirDocumentosPanel(
  tipoTramite: TipoTramiteSIAC,
  documentosInternos: Record<CodigoDocumentoGuia, number>,
): DocumentoPanel[] {
  const tramite = CATALOGO_TRAMITES_SIAC.find((t) => t.tipo === tipoTramite)
  const guias = tramite?.documentosGuia ?? []
  const pesos = PESOS_TRAMITE[tipoTramite]

  return guias.map((codigoGuia) => {
    const porcentajeInterno = documentosInternos[codigoGuia] ?? 0
    const peso = pesos[codigoGuia] ?? 0
    const aportacion = Math.round((peso * porcentajeInterno) / 100)
    const totalCondiciones = codigoGuia === 'G1' ? 9 : codigoGuia === 'G3' ? 6 : null
    const puntaje =
      totalCondiciones !== null
        ? Math.round((porcentajeInterno / 100) * totalCondiciones)
        : null

    return {
      codigoGuia,
      nombre: ETIQUETAS_GUIA[codigoGuia],
      puntaje,
      totalCondiciones,
      porcentajeInterno,
      peso,
      aportacion,
      revisado: porcentajeInterno > 0,
    }
  })
}

function construirProgreso(entidad: EntidadMockAdmin): ProgresoProcesoSIAC {
  const documentos = construirDocumentosPanel(entidad.tipoTramite, entidad.documentosInternos)
  const docsProgreso: DocumentoProgresoSIAC[] = documentos.map((doc) => ({
    codigoGuia: doc.codigoGuia,
    nombre: doc.nombre,
    peso: doc.peso,
    porcentajeInterno: doc.porcentajeInterno,
    aportacion: doc.aportacion,
    puntaje: doc.puntaje,
    totalCondiciones: doc.totalCondiciones,
    aceptado: doc.porcentajeInterno >= 100,
    conObservaciones: doc.porcentajeInterno > 0 && doc.porcentajeInterno < 100,
    rechazado: false,
  }))

  const aceptados = docsProgreso.filter((d) => d.aceptado).length

  return {
    programaId: entidad.id,
    tipoTramite: entidad.tipoTramite,
    avanceGlobal: entidad.porcentajeAvance,
    documentosAceptados: aceptados,
    documentosTotal: docsProgreso.length,
    documentos: docsProgreso,
  }
}

function sincronizarMetricas(entidad: EntidadMockAdmin): EntidadMockAdmin {
  const avance = calcularAvancePonderado(entidad.tipoTramite, entidad.documentosInternos)
  const semaforoAvance = calcularSemaforoAvance(avance)
  const semaforoVigencia = calcularSemaforoVigencia(entidad.fechaResolucion)
  const semaforoGeneral =
    semaforoVigencia === 'SinVigencia' ? semaforoAvance : colorMasCritico([semaforoAvance, semaforoVigencia])

  const estadoProceso =
    avance >= 100 && !entidad.fechaResolucion
      ? 'Completado — pendiente activación de vigencia'
      : avance >= 100
        ? 'Completado'
        : 'En progreso'

  return {
    ...entidad,
    porcentajeAvance: avance,
    semaforo: semaforoGeneral,
    semaforoAvance,
    semaforoVigencia,
    semaforoGeneral,
    estadoProceso,
    tipoTramiteActivo: entidad.tipoTramite,
  }
}

export function crearDatosSemilla(): EntidadMockAdmin[] {
  const institucionBase: EntidadMockAdmin = {
    id: ID_INSTITUCION_MOCK,
    nombre: 'Corporación Universitaria Autónoma del Cauca',
    codigo: 'CUAC',
    nivel: 'Pregrado',
    semaforo: 'Verde',
    porcentajeAvance: 0,
    estadoProceso: 'En progreso',
    facultad: null,
    slug: 'cuac',
    activo: true,
    alcance: 'Institucion',
    tipoTramite: 'RenovacionCondicionesInstitucionales',
    fechaResolucion: null,
    documentosInternos: { G1: 0, G2: 0, G3: 90, G4: 10 },
    semaforoAvance: 'Amarillo',
    semaforoVigencia: 'SinVigencia',
    semaforoGeneral: 'Amarillo',
  }

  return [sincronizarMetricas(institucionBase)]
}

export function entidadAFilaPanel(
  entidad: EntidadMockAdmin,
): FilaPanelPrograma & { activo?: boolean } {
  const documentos = construirDocumentosPanel(entidad.tipoTramite, entidad.documentosInternos)
  return {
    id: entidad.id,
    nombre: entidad.nombre,
    codigo: entidad.codigo,
    alcance: entidad.alcance,
    tipoTramite: entidad.tipoTramite,
    avancePorcentual: entidad.porcentajeAvance,
    semaforoAvance: entidad.semaforoAvance,
    semaforoVigencia: entidad.semaforoVigencia,
    semaforoGeneral: entidad.semaforoGeneral,
    documentos,
    anexoInfraestructuraVencido: false,
    fechaResolucion: entidad.fechaResolucion,
    fechaFinVigencia: null,
    semestre: null,
    activo: entidad.activo,
  }
}

export function entidadAPrograma(entidad: EntidadMockAdmin): Programa & {
  fechaResolucion?: string | null
  tipoTramite?: TipoTramiteSIAC
  alcance?: 'Programa' | 'Institucion'
} {
  return {
    id: entidad.id,
    nombre: entidad.nombre,
    codigo: entidad.codigo,
    nivel: entidad.nivel,
    semaforo: entidad.semaforo,
    porcentajeAvance: entidad.porcentajeAvance,
    estadoProceso: entidad.estadoProceso,
    facultad: entidad.facultad,
    slug: entidad.slug,
    activo: entidad.activo,
    tipoTramiteActivo: entidad.tipoTramite,
    fechaResolucion: entidad.fechaResolucion,
    tipoTramite: entidad.tipoTramite,
    alcance: entidad.alcance,
  }
}

export { construirProgreso, sincronizarMetricas, calcularPorcentajeVigencia }
