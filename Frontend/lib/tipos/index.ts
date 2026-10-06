export type RolUsuario =
  | 'Cargador'
  | 'Revisor'
  | 'ParAcademico'
  | 'Administrador'
  | 'SuperAdmin'

/**
 * HU-003 (regla n/9): el checklist deja ConObservaciones (n < total) o Cumple (n = total).
 * Validado y Rechazado solo salen de la decisión explícita del Revisor (HU-006).
 */
export type EstadoEvidencia =
  | 'Borrador'
  | 'EnRevision'
  | 'ConObservaciones'
  | 'Cumple'
  | 'Validado'
  | 'Rechazado'

export type EstadoVigencia = 'Vigente' | 'Proximo' | 'Vencido'

export type NivelPrograma = 'Pregrado' | 'Posgrado'

export type SemaforoPrograma = 'Verde' | 'Amarillo' | 'Rojo'
/** Semáforo de vigencia: «SinVigencia» (gris) cuando no hay resolución MEN registrada. */
export type SemaforoVigencia = SemaforoPrograma | 'SinVigencia'

export type TipoEtapaAcreditacion =
  | 'PreRadicacion'
  | 'Radicacion'
  | 'Autoevaluacion'
  | 'Renovacion'

export type TipoCondicionDecreto = 'Institucional' | 'Programa'

export type CategoriaPlantilla = 'Institucional' | 'Programa' | 'Autoevaluacion'

export type TipoTramitePlantilla = 'Renovacion' | 'NuevoPrograma' | 'General'

export type CodigoDocumentoGuia = 'G1' | 'G2' | 'G3' | 'G4'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  contrasena: string
  rol: RolUsuario
}

export interface ConteosEstadoPrograma {
  borrador: number
  enRevision: number
  conObservaciones: number
  cumple: number
  validado: number
  rechazado: number
}

export interface Programa {
  id: string
  nombre: string
  codigo: string
  nivel: NivelPrograma
  semaforo: SemaforoPrograma
  porcentajeAvance: number
  estadoProceso: string
  urlImagen?: string
  tipoTramiteActivo?: string
  facultad?: string | null
  slug?: string
  activo?: boolean
  modalidad?: string | null
  evidenciasValidadas?: number
  totalEvidencias?: number
  conteosEstado?: ConteosEstadoPrograma
}

export interface ResumenProgramaEvidencia {
  id: string
  nombre: string
  codigo?: string
  slug?: string
}

export interface Evidencia {
  id: string
  nombre: string
  programaId: string
  programa?: ResumenProgramaEvidencia
  periodo: string
  estado: EstadoEvidencia
  autorId: string
  nombreArchivo: string
  fechaCarga: string
  observaciones?: string
  responsable?: string
  documentoRequeridoId?: string
  version?: number
  /** Puntaje entero n de la última verificación (G1 n/9, G3 n/6). */
  puntajeActual?: number | null
  totalCondicionesActual?: number | null
  requiereChecklistMaestro?: boolean
  codigoGuia?: CodigoDocumentoGuia
}

export interface Plantilla {
  id: string
  nombre: string
  codigoGuia: CodigoDocumentoGuia
  formato: 'PDF' | 'DOCX'
  version: string
  vigente: boolean
  categoria: CategoriaPlantilla
  tipoTramite?: TipoTramitePlantilla
  esGuiaDocumentoMaestro?: boolean
  descripcion?: string
  urlDocumento?: string
  nombreArchivo?: string | null
}

/** Categoría explícita del anexo; RN-003 solo considera «Infraestructura». */
export type CategoriaAnexo = 'Infraestructura' | 'Permiso' | 'Convenio' | 'Otro'

export interface AnexoVigencia {
  id: string
  titulo: string
  programaId: string
  tipo: string
  categoria?: CategoriaAnexo
  /** Evidencia (documento guía) que respalda el anexo. */
  evidenciaId?: string | null
  fechaExpedicion?: string | null
  carpeta?: string
  nombreArchivo?: string
  aniosVigencia?: number
  fechaCarga?: string
  fechaVencimiento: string
  estado: EstadoVigencia
  responsable: string
  porcentajeTranscurrido?: number
}

export interface AlertaInApp {
  id: string
  mensaje: string
  fecha: string
  leida: boolean
}

export interface SesionUsuario {
  usuarioId: string
  nombre: string
  correo: string
  rol: RolUsuario
}

export interface CondicionDecreto {
  id: string
  tipo: TipoCondicionDecreto
  numero: number
  nombre: string
  descripcion: string
}

export interface EtapaAcreditacion {
  id: string
  nombre: string
  tipo: TipoEtapaAcreditacion
  descripcion: string
  orden: number
  activa: boolean
}

export interface CarpetaNormativa {
  id: string
  etapaId: string
  condicionId?: string
  nombre: string
  descripcion: string
  orden: number
  activa: boolean
}

export interface DocumentoRequerido {
  id: string
  carpetaId: string
  nombre: string
  esPlantilla: boolean
  formato: 'PDF' | 'DOCX' | 'XLSX'
  obligatorio: boolean
  orden: number
}
