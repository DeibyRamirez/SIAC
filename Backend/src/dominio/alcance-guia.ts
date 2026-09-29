import { AlcanceTramiteSIAC, CodigoDocumentoGuia, TipoTramiteSIAC } from '@prisma/client';

/**
 * HU-010: cada guía pertenece a un alcance. G1 y G2 son de programa; G3 y G4 son de la
 * institución (CUAC). T-003.3 usará este mismo alcance para colgar el catálogo de
 * condiciones: las de G1 al programa y las de G3 a la institución.
 */
export const GUIAS_INSTITUCIONALES: readonly CodigoDocumentoGuia[] = [
  CodigoDocumentoGuia.G3,
  CodigoDocumentoGuia.G4,
];

export const TRAMITES_DE_PROGRAMA: readonly TipoTramiteSIAC[] = [
  TipoTramiteSIAC.RegistroCalificadoNuevo,
  TipoTramiteSIAC.RenovacionRegistroCalificado,
];

export const TRAMITES_INSTITUCIONALES: readonly TipoTramiteSIAC[] = [
  TipoTramiteSIAC.CondicionesInstitucionalesNuevas,
  TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
];

export function esGuiaInstitucional(codigo: CodigoDocumentoGuia | null | undefined): boolean {
  return !!codigo && GUIAS_INSTITUCIONALES.includes(codigo);
}

/** Alcance del propietario de un documento según su guía. Sin guía se trata como programa. */
export function alcanceDeGuia(codigo: CodigoDocumentoGuia | null | undefined): AlcanceTramiteSIAC {
  return esGuiaInstitucional(codigo) ? AlcanceTramiteSIAC.Institucion : AlcanceTramiteSIAC.Programa;
}

export function alcanceDeTramite(tipo: TipoTramiteSIAC): AlcanceTramiteSIAC {
  return TRAMITES_INSTITUCIONALES.includes(tipo)
    ? AlcanceTramiteSIAC.Institucion
    : AlcanceTramiteSIAC.Programa;
}
