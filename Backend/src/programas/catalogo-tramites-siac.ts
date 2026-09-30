import { CodigoDocumentoGuia, TipoTramiteSIAC, AlcanceTramiteSIAC } from '@prisma/client';

export interface DocumentoGuiaTramite {
  codigo: CodigoDocumentoGuia;
  pesoPorcentaje: number;
}

export interface TramiteSIACDefinicion {
  tipo: TipoTramiteSIAC;
  alcance: AlcanceTramiteSIAC;
  nombre: string;
  documentosGuia: DocumentoGuiaTramite[];
}

/** Pesos iniciales T-010.2 — deben sumar 100 % por trámite. */
export const PESOS_DOCUMENTO_GUIA: Record<
  TipoTramiteSIAC,
  Partial<Record<CodigoDocumentoGuia, number>>
> = {
  [TipoTramiteSIAC.RegistroCalificadoNuevo]: { G1: 100 },
  [TipoTramiteSIAC.RenovacionRegistroCalificado]: { G1: 90, G2: 10 },
  [TipoTramiteSIAC.CondicionesInstitucionalesNuevas]: { G3: 100 },
  [TipoTramiteSIAC.RenovacionCondicionesInstitucionales]: { G3: 85, G4: 15 },
};

function documentosConPesos(
  tipo: TipoTramiteSIAC,
  guias: CodigoDocumentoGuia[],
): DocumentoGuiaTramite[] {
  const pesos = PESOS_DOCUMENTO_GUIA[tipo];
  return guias.map((codigo) => ({
    codigo,
    pesoPorcentaje: pesos[codigo] ?? Math.round(100 / guias.length),
  }));
}

export const CATALOGO_TRAMITES_SIAC: TramiteSIACDefinicion[] = [
  {
    tipo: TipoTramiteSIAC.RegistroCalificadoNuevo,
    alcance: AlcanceTramiteSIAC.Programa,
    nombre: 'Registro calificado nuevo',
    documentosGuia: documentosConPesos(TipoTramiteSIAC.RegistroCalificadoNuevo, [
      CodigoDocumentoGuia.G1,
    ]),
  },
  {
    tipo: TipoTramiteSIAC.RenovacionRegistroCalificado,
    alcance: AlcanceTramiteSIAC.Programa,
    nombre: 'Renovación de registro calificado',
    documentosGuia: documentosConPesos(TipoTramiteSIAC.RenovacionRegistroCalificado, [
      CodigoDocumentoGuia.G1,
      CodigoDocumentoGuia.G2,
    ]),
  },
  {
    tipo: TipoTramiteSIAC.CondicionesInstitucionalesNuevas,
    alcance: AlcanceTramiteSIAC.Institucion,
    nombre: 'Condiciones institucionales nuevas',
    documentosGuia: documentosConPesos(TipoTramiteSIAC.CondicionesInstitucionalesNuevas, [
      CodigoDocumentoGuia.G3,
    ]),
  },
  {
    tipo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
    alcance: AlcanceTramiteSIAC.Institucion,
    nombre: 'Renovación de condiciones institucionales',
    documentosGuia: documentosConPesos(
      TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
      [CodigoDocumentoGuia.G3, CodigoDocumentoGuia.G4],
    ),
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
