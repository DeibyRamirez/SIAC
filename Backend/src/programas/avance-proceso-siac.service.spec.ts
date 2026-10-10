import { CodigoDocumentoGuia, EstadoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { AvanceProcesoSIACService, porcentajeInternoEvidencia } from './avance-proceso-siac.service';

/** Decisión del PO (06/10): G2/G4 sin puntaje; aportan 0 % hasta aprobarse y el 100 % de su peso después. */
describe('AvanceProcesoSIACService · G2/G4 sin puntaje', () => {
  function crearServicio(evidencias: unknown[], pesos = [
    { codigoGuia: CodigoDocumentoGuia.G1, pesoPorcentaje: 50 },
    { codigoGuia: CodigoDocumentoGuia.G2, pesoPorcentaje: 50 },
  ]) {
    const inicioCiclo = new Date('2020-01-01T00:00:00.000Z');
    const prisma = {
      programa: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
          inicioCicloTramiteAt: inicioCiclo,
        }),
      },
      tramiteDocumentoGuia: { findMany: jest.fn().mockResolvedValue(pesos) },
      evidencia: { findMany: jest.fn().mockResolvedValue(evidencias) },
    };
    return new AvanceProcesoSIACService(prisma as never);
  }

  const g1Cumple = {
    codigoGuia: CodigoDocumentoGuia.G1,
    estado: EstadoEvidencia.Cumple,
    puntajeActual: 9,
    totalCondicionesActual: 9,
    updatedAt: new Date('2026-10-01'),
    createdAt: new Date('2026-09-01'),
  };

  it('renovación con G1 9/9 y G2 «Con observaciones» = 50 %', async () => {
    const servicio = crearServicio([
      g1Cumple,
      {
        codigoGuia: CodigoDocumentoGuia.G2,
        estado: EstadoEvidencia.ConObservaciones,
        puntajeActual: null,
        totalCondicionesActual: null,
        updatedAt: new Date('2026-10-02'),
        createdAt: new Date('2026-09-02'),
      },
    ]);

    const progreso = await servicio.calcularProgresoPrograma('p1');

    expect(progreso.avanceGlobal).toBe(50);
    expect(progreso.documentos.find((d) => d.codigoGuia === 'G2')).toMatchObject({
      porcentajeInterno: 0,
      aportacion: 0,
      conObservaciones: true,
    });
  });

  it('renovación con G1 9/9 y G2 aprobado = 100 %', async () => {
    const servicio = crearServicio([
      g1Cumple,
      {
        codigoGuia: CodigoDocumentoGuia.G2,
        estado: EstadoEvidencia.Validado,
        puntajeActual: null,
        totalCondicionesActual: null,
        updatedAt: new Date('2026-10-02'),
        createdAt: new Date('2026-09-02'),
      },
    ]);

    const progreso = await servicio.calcularProgresoPrograma('p1');

    expect(progreso.avanceGlobal).toBe(100);
    expect(progreso.documentosAceptados).toBe(2);
  });

  it('el peso del G2 es el configurado en la BD (p. ej. 20 %)', async () => {
    const servicio = crearServicio(
      [
        {
          ...g1Cumple,
          estado: EstadoEvidencia.ConObservaciones,
          puntajeActual: 8,
          createdAt: new Date('2026-09-01'),
        },
        {
          codigoGuia: CodigoDocumentoGuia.G2,
          estado: EstadoEvidencia.Validado,
          puntajeActual: null,
          totalCondicionesActual: null,
          updatedAt: new Date('2026-10-02'),
          createdAt: new Date('2026-09-02'),
        },
      ],
      [
        { codigoGuia: CodigoDocumentoGuia.G1, pesoPorcentaje: 80 },
        { codigoGuia: CodigoDocumentoGuia.G2, pesoPorcentaje: 20 },
      ],
    );

    const progreso = await servicio.calcularProgresoPrograma('p1');

    // 8/9 × 80 + 100 × 20 / 100 = 71,11 + 20 = 91,11
    expect(progreso.avanceGlobal).toBe(91.11);
  });

  it('un puntaje viejo en un G2 «Con observaciones» ya no cuenta (se elimina el criterio «G2 al 70 %»)', () => {
    expect(
      porcentajeInternoEvidencia({
        codigoGuia: CodigoDocumentoGuia.G2,
        estado: EstadoEvidencia.ConObservaciones,
        puntajeActual: 7,
        totalCondicionesActual: 10,
      }),
    ).toBe(0);
    expect(
      porcentajeInternoEvidencia({
        codigoGuia: CodigoDocumentoGuia.G4,
        estado: EstadoEvidencia.Validado,
        puntajeActual: null,
        totalCondicionesActual: null,
      }),
    ).toBe(100);
  });
});
