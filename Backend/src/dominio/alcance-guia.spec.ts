import { AlcanceTramiteSIAC, CodigoDocumentoGuia, TipoTramiteSIAC } from '@prisma/client';
import { alcanceDeGuia, alcanceDeTramite, esGuiaInstitucional } from './alcance-guia';

describe('alcance de guías y trámites (HU-010)', () => {
  it('G1 y G2 pertenecen al programa', () => {
    expect(alcanceDeGuia(CodigoDocumentoGuia.G1)).toBe(AlcanceTramiteSIAC.Programa);
    expect(alcanceDeGuia(CodigoDocumentoGuia.G2)).toBe(AlcanceTramiteSIAC.Programa);
  });

  it('G3 y G4 pertenecen a la institución', () => {
    expect(alcanceDeGuia(CodigoDocumentoGuia.G3)).toBe(AlcanceTramiteSIAC.Institucion);
    expect(alcanceDeGuia(CodigoDocumentoGuia.G4)).toBe(AlcanceTramiteSIAC.Institucion);
    expect(esGuiaInstitucional(CodigoDocumentoGuia.G4)).toBe(true);
  });

  it('un documento sin guía se trata como de programa', () => {
    expect(alcanceDeGuia(null)).toBe(AlcanceTramiteSIAC.Programa);
    expect(esGuiaInstitucional(undefined)).toBe(false);
  });

  it('los trámites de condiciones institucionales son de la institución', () => {
    expect(alcanceDeTramite(TipoTramiteSIAC.RenovacionCondicionesInstitucionales)).toBe(
      AlcanceTramiteSIAC.Institucion,
    );
    expect(alcanceDeTramite(TipoTramiteSIAC.RegistroCalificadoNuevo)).toBe(
      AlcanceTramiteSIAC.Programa,
    );
  });
});
