import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import { transicionPermitida, type GuiaEvidencia } from './maquina-estados-evidencia';

const GUIA = CodigoDocumentoGuia;

describe('maquina-estados-evidencia · transicionPermitida', () => {
  describe('transiciones válidas', () => {
    it.each<[EstadoEvidencia, EstadoEvidencia, GuiaEvidencia, string]>([
      [EstadoEvidencia.Borrador, EstadoEvidencia.EnRevision, GUIA.G1, 'G1'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.EnRevision, GUIA.G2, 'G2'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.EnRevision, GUIA.G3, 'G3'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.EnRevision, GUIA.G4, 'G4'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.EnRevision, null, 'legado'],
      [EstadoEvidencia.ConObservaciones, EstadoEvidencia.EnRevision, GUIA.G1, 'G1'],
      [EstadoEvidencia.ConObservaciones, EstadoEvidencia.EnRevision, GUIA.G2, 'G2'],
      [EstadoEvidencia.ConObservaciones, EstadoEvidencia.EnRevision, null, 'legado'],
      [EstadoEvidencia.Rechazado, EstadoEvidencia.EnRevision, GUIA.G1, 'G1'],
      [EstadoEvidencia.Rechazado, EstadoEvidencia.EnRevision, null, 'legado'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.Borrador, GUIA.G1, 'nueva versión'],
      [EstadoEvidencia.ConObservaciones, EstadoEvidencia.ConObservaciones, GUIA.G1, 'nueva versión'],
      [EstadoEvidencia.ConObservaciones, EstadoEvidencia.ConObservaciones, null, 'nueva versión'],
      [EstadoEvidencia.Rechazado, EstadoEvidencia.Rechazado, GUIA.G1, 'nueva versión'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Cumple, GUIA.G1, 'G1 9/9'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Cumple, GUIA.G3, 'G3 6/6'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.ConObservaciones, GUIA.G1, 'G1 n<9'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.ConObservaciones, GUIA.G2, 'G2 corrección'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.ConObservaciones, GUIA.G3, 'G3 n<6'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.ConObservaciones, GUIA.G4, 'G4 corrección'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Validado, GUIA.G2, 'G2 aprobado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Validado, GUIA.G4, 'G4 aprobado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Validado, null, 'legado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Rechazado, null, 'legado'],
    ])('%s → %s (%s) es válida', (origen, destino, guia) => {
      expect(transicionPermitida(origen, destino, guia)).toBe(true);
    });
  });

  describe('transiciones inválidas', () => {
    it.each<[EstadoEvidencia, EstadoEvidencia, GuiaEvidencia, string]>([
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Cumple, GUIA.G2, 'G2 no se puntúa'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Cumple, GUIA.G4, 'G4 no se puntúa'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Cumple, null, 'legado no se puntúa'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Validado, GUIA.G1, 'G1 no usa Validado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Validado, GUIA.G3, 'G3 no usa Validado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Rechazado, GUIA.G1, 'G1 nunca Rechazado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Rechazado, GUIA.G2, 'G2 nunca Rechazado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Rechazado, GUIA.G3, 'G3 nunca Rechazado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.Rechazado, GUIA.G4, 'G4 nunca Rechazado'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.ConObservaciones, null, 'legado sin checklist'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.Validado, GUIA.G1, 'salto de estados'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.ConObservaciones, GUIA.G1, 'salto de estados'],
      [EstadoEvidencia.Borrador, EstadoEvidencia.Cumple, GUIA.G1, 'salto de estados'],
      [EstadoEvidencia.EnRevision, EstadoEvidencia.EnRevision, GUIA.G1, 'sin cambio'],
      [EstadoEvidencia.Cumple, EstadoEvidencia.EnRevision, GUIA.G1, 'Cumple es final'],
      [EstadoEvidencia.Validado, EstadoEvidencia.EnRevision, GUIA.G2, 'Validado es final'],
      [EstadoEvidencia.Validado, EstadoEvidencia.ConObservaciones, GUIA.G2, 'Validado es final'],
      [EstadoEvidencia.Cumple, EstadoEvidencia.Cumple, GUIA.G1, 'sin nueva versión'],
    ])('%s → %s (%s) es inválida', (origen, destino, guia) => {
      expect(transicionPermitida(origen, destino, guia)).toBe(false);
    });

    it('rechaza origen o destino nulos', () => {
      expect(transicionPermitida(null, EstadoEvidencia.EnRevision, GUIA.G1)).toBe(false);
      expect(transicionPermitida(EstadoEvidencia.EnRevision, null, GUIA.G1)).toBe(false);
      expect(transicionPermitida(undefined, undefined, undefined)).toBe(false);
    });
  });
});
