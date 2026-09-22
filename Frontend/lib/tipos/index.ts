export type RolUsuario =
  | 'Cargador'
  | 'Revisor'
  | 'ParAcademico'
  | 'Administrador'
  | 'SuperAdmin'

export type EstadoEvidencia = 'Borrador' | 'EnRevision' | 'Validado' | 'Rechazado'

export type EstadoVigencia = 'Vigente' | 'Proximo' | 'Vencido'

export type NivelPrograma = 'Pregrado' | 'Posgrado'

export type SemaforoPrograma = 'Verde' | 'Amarillo' | 'Rojo'

export type TipoEtapaAcreditacion =
  | 'PreRadicacion'
  | 'Radicacion'
  | 'Autoevaluacion'
  | 'Renovacion'

export type TipoCondicionDecreto = 'Institucional' | 'Programa'

export type CategoriaPlantilla = 'Institucional' | 'Programa' | 'Autoevaluacion'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  contrasena: string
  rol: RolUsuario
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
}

export interface Evidencia {
  id: string
  nombre: string
  programaId: string
  periodo: string
  factor: string
  indicador: string
  estado: EstadoEvidencia
  autorId: string
  nombreArchivo: string
  fechaCarga: string
  observaciones?: string
  responsable?: string
  documentoRequeridoId?: string
  version?: number
}

export interface Plantilla {
  id: string
  nombre: string
  factor: string
  formato: 'PDF' | 'DOCX' | 'XLSX'
  version: string
  vigente: boolean
  categoria: CategoriaPlantilla
  descripcion?: string
  urlDocumento?: string
}

export interface AnexoVigencia {
  id: string
  titulo: string
  programaId: string
  tipo: string
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
