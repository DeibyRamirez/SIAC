export type RolUsuario =
  | 'Cargador'
  | 'Revisor'
  | 'Administrador'
  | 'ParAcademico'

export type EstadoEvidencia = 'Borrador' | 'EnRevision' | 'Validado' | 'Rechazado'

export type EstadoVigencia = 'Vigente' | 'Proximo' | 'Vencido'

export type NivelPrograma = 'Pregrado' | 'Posgrado'

export type SemaforoPrograma = 'Verde' | 'Amarillo' | 'Rojo'

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
}

export interface Plantilla {
  id: string
  nombre: string
  factor: string
  formato: 'PDF' | 'DOCX' | 'XLSX'
  version: string
  vigente: boolean
  categoria?: string
}

export interface AnexoVigencia {
  id: string
  titulo: string
  programaId: string
  tipo: string
  fechaVencimiento: string
  estado: EstadoVigencia
  responsable: string
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
