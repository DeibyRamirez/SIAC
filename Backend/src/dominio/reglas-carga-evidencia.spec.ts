import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import {
  calcularReglasCargaGuias,
  validarNuevaCargaEvidencia,
} from './reglas-carga-evidencia';

describe('reglas-carga-evidencia', () => {
  const tramiteRenovacion = [CodigoDocumentoGuia.G1, CodigoDocumentoGuia.G2];

  it('G1 en revisión bloquea otro G1 y no habilita G2', () => {
    const reglas = calcularReglasCargaGuias(
      tramiteRenovacion,
      [{ codigoGuia: CodigoDocumentoGuia.G1, aceptado: false }],
      [{ codigoGuia: CodigoDocumentoGuia.G1, estado: EstadoEvidencia.EnRevision }],
    );
    expect(reglas.guiasDisponiblesCarga).toEqual([]);
    expect(reglas.bloqueosCarga.map((b) => b.codigoGuia)).toEqual([
      CodigoDocumentoGuia.G1,
      CodigoDocumentoGuia.G2,
    ]);
    expect(validarNuevaCargaEvidencia(CodigoDocumentoGuia.G1, reglas)).toMatch(/pendiente de verificación/);
  });

  it('G1 en borrador bloquea duplicado', () => {
    const reglas = calcularReglasCargaGuias(
      [CodigoDocumentoGuia.G1],
      [{ codigoGuia: CodigoDocumentoGuia.G1, aceptado: false }],
      [{ codigoGuia: CodigoDocumentoGuia.G1, estado: EstadoEvidencia.Borrador }],
    );
    expect(reglas.guiasDisponiblesCarga).toEqual([]);
    expect(validarNuevaCargaEvidencia(CodigoDocumentoGuia.G1, reglas)).toMatch(/borrador/);
  });

  it('G1 aceptado habilita G2 en renovación', () => {
    const reglas = calcularReglasCargaGuias(
      tramiteRenovacion,
      [
        { codigoGuia: CodigoDocumentoGuia.G1, aceptado: true },
        { codigoGuia: CodigoDocumentoGuia.G2, aceptado: false },
      ],
      [],
    );
    expect(reglas.guiasDisponiblesCarga).toEqual([CodigoDocumentoGuia.G2]);
    expect(validarNuevaCargaEvidencia(CodigoDocumentoGuia.G2, reglas)).toBeNull();
  });

  it('G1 con observaciones bloquea nueva carga y sugiere corrección', () => {
    const reglas = calcularReglasCargaGuias(
      tramiteRenovacion,
      [{ codigoGuia: CodigoDocumentoGuia.G1, aceptado: false }],
      [{ codigoGuia: CodigoDocumentoGuia.G1, estado: EstadoEvidencia.ConObservaciones }],
    );
    expect(validarNuevaCargaEvidencia(CodigoDocumentoGuia.G1, reglas)).toMatch(/nueva versión/);
  });

  /**
   * Decisión CP-E2E-04 (cierre HU-006, 16/10): mientras exista una evidencia abierta de la
   * misma guía (Borrador, EnRevision, ConObservaciones o Rechazado legado) no se crea otra;
   * el flujo real es subir una nueva versión de la evidencia existente (PATCH …/archivo).
   */
  it.each([
    EstadoEvidencia.Borrador,
    EstadoEvidencia.EnRevision,
    EstadoEvidencia.ConObservaciones,
    EstadoEvidencia.Rechazado,
  ])('CP-E2E-04: una segunda carga G1 con la primera en %s devuelve bloqueo', (estado) => {
    const reglas = calcularReglasCargaGuias(
      [CodigoDocumentoGuia.G1],
      [{ codigoGuia: CodigoDocumentoGuia.G1, aceptado: false }],
      [{ codigoGuia: CodigoDocumentoGuia.G1, estado }],
    );
    expect(reglas.guiasDisponiblesCarga).not.toContain(CodigoDocumentoGuia.G1);
    expect(validarNuevaCargaEvidencia(CodigoDocumentoGuia.G1, reglas)).not.toBeNull();
  });

  it('CP-E2E-04: sin evidencia abierta, la carga G1 vuelve a estar disponible', () => {
    const reglas = calcularReglasCargaGuias(
      [CodigoDocumentoGuia.G1],
      [{ codigoGuia: CodigoDocumentoGuia.G1, aceptado: false }],
      [],
    );
    expect(validarNuevaCargaEvidencia(CodigoDocumentoGuia.G1, reglas)).toBeNull();
  });
});
