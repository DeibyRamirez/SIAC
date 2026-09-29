import { CodigoCondicionDocumentoMaestro } from '@prisma/client';

export const TOTAL_CONDICIONES_DOCUMENTO_MAESTRO = 9;

export interface DefinicionCondicionDocumentoMaestro {
  codigo: CodigoCondicionDocumentoMaestro;
  etiqueta: string;
}

export const CONDICIONES_DOCUMENTO_MAESTRO: DefinicionCondicionDocumentoMaestro[] =
  [
    {
      codigo: CodigoCondicionDocumentoMaestro.Denominacion,
      etiqueta: 'Denominación del programa',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.Justificacion,
      etiqueta: 'Justificación del programa',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.AspectosCurriculares,
      etiqueta: 'Aspectos curriculares',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.OrganizacionActividades,
      etiqueta:
        'Organización de actividades académicas y proceso formativo',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.InvestigacionInnovacion,
      etiqueta:
        'Investigación, innovación y/o creación artística y cultural',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.RelacionSectorExterno,
      etiqueta: 'Relación con el sector externo',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.Profesores,
      etiqueta: 'Profesores',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.MediosEducativos,
      etiqueta: 'Medios educativos',
    },
    {
      codigo: CodigoCondicionDocumentoMaestro.Infraestructura,
      etiqueta: 'Infraestructura física y tecnológica',
    },
  ];

export const CODIGOS_CONDICION_DOCUMENTO_MAESTRO =
  CONDICIONES_DOCUMENTO_MAESTRO.map((c) => c.codigo);

export function etiquetaCondicion(
  codigo: CodigoCondicionDocumentoMaestro,
): string {
  return (
    CONDICIONES_DOCUMENTO_MAESTRO.find((c) => c.codigo === codigo)?.etiqueta ??
    codigo
  );
}
