export type CodigoDocumentoGuia = 'G1' | 'G2' | 'G3' | 'G4'

export type TipoTramiteSIAC =
  | 'RegistroCalificadoNuevo'
  | 'RenovacionRegistroCalificado'
  | 'CondicionesInstitucionalesNuevas'
  | 'RenovacionCondicionesInstitucionales'

export type AlcanceTramiteUI = 'Programa' | 'Institucion'
export type ModalidadTramiteUI = 'Nuevo' | 'Renovacion'

export const ETIQUETAS_GUIA: Record<CodigoDocumentoGuia, string> = {
  G1: 'Documento maestro de programa',
  G2: 'Respaldo de mejoramiento de programa',
  G3: 'Documento maestro institucional',
  G4: 'Respaldo de mejoramiento institucional',
}

export const DESCRIPCIONES_GUIA: Record<CodigoDocumentoGuia, string> = {
  G1:
    'Documento maestro de programa: 9 condiciones de programa (arts. 2.5.3.2.3.2.2 a 2.5.3.2.3.2.10): denominación, justificación, aspectos curriculares, organización de actividades académicas, investigación/creación, relación con el sector externo, profesores, medios educativos, infraestructura física y tecnológica.',
  G2: 'Respaldo de mejoramiento de programa (art. 2.5.3.2.3.2.12).',
  G3:
    'Documento maestro institucional: 6 condiciones institucionales (arts. 2.5.3.2.3.1.2 a 2.5.3.2.3.1.7): selección y evaluación de estudiantes y profesores, estructura administrativa y académica, cultura de la autoevaluación, egresados, bienestar, recursos. Incluye como secciones el informe de autoevaluación y el plan de desarrollo (art. 2.5.3.2.3.1.8).',
  G4: 'Respaldo de mejoramiento institucional (art. 2.5.3.2.3.1.9).',
}

export function guiasPermitidasPorTramite(
  tipoTramite: TipoTramiteSIAC | undefined,
): CodigoDocumentoGuia[] {
  if (!tipoTramite) return ['G1', 'G2', 'G3', 'G4']
  const tramite = CATALOGO_TRAMITES_SIAC.find((item) => item.tipo === tipoTramite)
  return tramite?.documentosGuia ?? ['G1', 'G2', 'G3', 'G4']
}

export function guiaUsaChecklistPrograma(guia: CodigoDocumentoGuia): boolean {
  return guia === 'G1'
}

export function guiaUsaChecklistInstitucional(guia: CodigoDocumentoGuia): boolean {
  return guia === 'G3'
}

export const CATALOGO_TRAMITES_SIAC: {
  tipo: TipoTramiteSIAC
  nombre: string
  alcance: AlcanceTramiteUI
  modalidad: ModalidadTramiteUI
  documentosGuia: CodigoDocumentoGuia[]
}[] = [
  {
    tipo: 'RegistroCalificadoNuevo',
    nombre: 'Registro calificado nuevo',
    alcance: 'Programa',
    modalidad: 'Nuevo',
    documentosGuia: ['G1'],
  },
  {
    tipo: 'RenovacionRegistroCalificado',
    nombre: 'Renovación de registro calificado',
    alcance: 'Programa',
    modalidad: 'Renovacion',
    documentosGuia: ['G1', 'G2'],
  },
  {
    tipo: 'CondicionesInstitucionalesNuevas',
    nombre: 'Condiciones institucionales nuevas',
    alcance: 'Institucion',
    modalidad: 'Nuevo',
    documentosGuia: ['G3'],
  },
  {
    tipo: 'RenovacionCondicionesInstitucionales',
    nombre: 'Renovación de condiciones institucionales',
    alcance: 'Institucion',
    modalidad: 'Renovacion',
    documentosGuia: ['G3', 'G4'],
  },
]

export function tramiteDesdeSeleccion(
  alcance: AlcanceTramiteUI,
  modalidad: ModalidadTramiteUI,
) {
  return CATALOGO_TRAMITES_SIAC.find(
    (item) => item.alcance === alcance && item.modalidad === modalidad,
  )
}

export function documentosExigidosPorSeleccion(
  alcance: AlcanceTramiteUI,
  modalidad: ModalidadTramiteUI,
): CodigoDocumentoGuia[] {
  return tramiteDesdeSeleccion(alcance, modalidad)?.documentosGuia ?? []
}

export function etiquetaModalidad(modalidad: ModalidadTramiteUI): string {
  return modalidad === 'Nuevo' ? 'Trámite nuevo' : 'Renovación'
}

export function etiquetaAlcance(alcance: AlcanceTramiteUI): string {
  return alcance === 'Programa' ? 'Programa académico' : 'Institución (IES)'
}
