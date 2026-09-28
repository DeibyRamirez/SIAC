import { CodigoDocumentoGuia, TipoTramiteSIAC, AlcanceTramiteSIAC } from '@prisma/client';

export interface TramiteSIACDefinicion {
  tipo: TipoTramiteSIAC;
  alcance: AlcanceTramiteSIAC;
  nombre: string;
  documentosGuia: CodigoDocumentoGuia[];
}

export const CATALOGO_TRAMITES_SIAC: TramiteSIACDefinicion[] = [
  {
    tipo: TipoTramiteSIAC.RegistroCalificadoNuevo,
    alcance: AlcanceTramiteSIAC.Programa,
    nombre: 'Registro calificado nuevo',
    documentosGuia: [CodigoDocumentoGuia.G1],
  },
  {
    tipo: TipoTramiteSIAC.RenovacionRegistroCalificado,
    alcance: AlcanceTramiteSIAC.Programa,
    nombre: 'Renovación de registro calificado',
    documentosGuia: [CodigoDocumentoGuia.G1, CodigoDocumentoGuia.G2],
  },
  {
    tipo: TipoTramiteSIAC.CondicionesInstitucionalesNuevas,
    alcance: AlcanceTramiteSIAC.Institucion,
    nombre: 'Condiciones institucionales nuevas',
    documentosGuia: [CodigoDocumentoGuia.G3],
  },
  {
    tipo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
    alcance: AlcanceTramiteSIAC.Institucion,
    nombre: 'Renovación de condiciones institucionales',
    documentosGuia: [CodigoDocumentoGuia.G3, CodigoDocumentoGuia.G4],
  },
];

export const ETIQUETAS_GUIA: Record<CodigoDocumentoGuia, string> = {
  G1: 'Documento maestro de programa',
  G2: 'Respaldo de mejoramiento de programa',
  G3: 'Documento maestro institucional',
  G4: 'Respaldo de mejoramiento institucional',
};

export function tramitePorTipo(tipo: TipoTramiteSIAC): TramiteSIACDefinicion {
  const tramite = CATALOGO_TRAMITES_SIAC.find((item) => item.tipo === tipo);
  if (!tramite) {
    throw new Error(`Trámite SIAC no configurado: ${tipo}`);
  }
  return tramite;
}
