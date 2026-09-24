export type CodigoCondicionDocumentoMaestro =
  | 'Denominacion'
  | 'Justificacion'
  | 'AspectosCurriculares'
  | 'OrganizacionActividades'
  | 'InvestigacionInnovacion'
  | 'RelacionSectorExterno'
  | 'Profesores'
  | 'MediosEducativos'
  | 'Infraestructura'

export const TOTAL_CONDICIONES_DOCUMENTO_MAESTRO = 9

export const PESO_POR_CONDICION_DOCUMENTO_MAESTRO =
  100 / TOTAL_CONDICIONES_DOCUMENTO_MAESTRO

export interface DefinicionCondicionDocumentoMaestro {
  codigo: CodigoCondicionDocumentoMaestro
  etiqueta: string
}

export const CONDICIONES_DOCUMENTO_MAESTRO: DefinicionCondicionDocumentoMaestro[] =
  [
    { codigo: 'Denominacion', etiqueta: 'Denominación del programa' },
    { codigo: 'Justificacion', etiqueta: 'Justificación del programa' },
    { codigo: 'AspectosCurriculares', etiqueta: 'Aspectos curriculares' },
    {
      codigo: 'OrganizacionActividades',
      etiqueta:
        'Organización de actividades académicas y proceso formativo',
    },
    {
      codigo: 'InvestigacionInnovacion',
      etiqueta:
        'Investigación, innovación y/o creación artística y cultural',
    },
    {
      codigo: 'RelacionSectorExterno',
      etiqueta: 'Relación con el sector externo',
    },
    { codigo: 'Profesores', etiqueta: 'Profesores' },
    { codigo: 'MediosEducativos', etiqueta: 'Medios educativos' },
    {
      codigo: 'Infraestructura',
      etiqueta: 'Infraestructura física y tecnológica',
    },
  ]

export const CODIGOS_CONDICION_DOCUMENTO_MAESTRO =
  CONDICIONES_DOCUMENTO_MAESTRO.map((c) => c.codigo)

export function calcularPorcentajeCondiciones(cumplidas: number): number {
  if (cumplidas <= 0) return 0
  if (cumplidas >= TOTAL_CONDICIONES_DOCUMENTO_MAESTRO) return 100
  return Math.round(
    (cumplidas / TOTAL_CONDICIONES_DOCUMENTO_MAESTRO) * 100,
  )
}

export function etiquetaCondicion(codigo: CodigoCondicionDocumentoMaestro): string {
  return (
    CONDICIONES_DOCUMENTO_MAESTRO.find((c) => c.codigo === codigo)?.etiqueta ??
    codigo
  )
}

export interface EvaluacionCondicionEvidencia {
  codigoCondicion: CodigoCondicionDocumentoMaestro
  cumple: boolean
  observacion?: string | null
  numeroRevision?: number
}
