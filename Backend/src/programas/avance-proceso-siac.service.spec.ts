import { NotFoundException } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';

describe('AvanceProcesoSIACService (HU-010)', () => {
  const prisma = {
    programa: { findUnique: jest.fn() },
    institucion: { findUnique: jest.fn() },
    evidencia: { findMany: jest.fn() },
    documentoRequerido: { findMany: jest.fn() },
  };
  const servicio = new AvanceProcesoSIACService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.documentoRequerido.findMany.mockResolvedValue([]);
  });

  it('el avance institucional lee G3/G4 de la institución, no de un programa', async () => {
    prisma.institucion.findUnique.mockResolvedValue({
      id: 'institucion-cuac',
      tipoTramiteActivo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
    });
    prisma.evidencia.findMany.mockResolvedValue([
      {
        documentoRequeridoId: null,
        codigoGuia: CodigoDocumentoGuia.G3,
        estado: EstadoEvidencia.ConObservaciones,
        puntajeActual: 3,
        totalCondicionesActual: 6,
      },
      {
        documentoRequeridoId: null,
        codigoGuia: CodigoDocumentoGuia.G4,
        estado: EstadoEvidencia.Validado,
        puntajeActual: null,
        totalCondicionesActual: null,
      },
    ]);

    const progreso = await servicio.calcularProgresoInstitucion('institucion-cuac');

    expect(prisma.evidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institucionId: 'institucion-cuac' } }),
    );
    expect(progreso.institucionId).toBe('institucion-cuac');
    expect(progreso.programaId).toBeUndefined();
    expect(progreso.documentos.map((d) => d.codigoGuia)).toEqual(['G3', 'G4']);
    // G3 3/6 => 50 % interno => 25 de 50; G4 validado => 50 de 50.
    expect(progreso.avanceGlobal).toBe(75);
    expect(progreso.documentosAceptados).toBe(1);
    expect(progreso.documentos[0]).toMatchObject({ puntaje: 3, totalCondiciones: 6 });
  });

  it('el avance del programa solo mira sus propias evidencias', async () => {
    prisma.programa.findUnique.mockResolvedValue({
      id: 'p1',
      tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
    });
    prisma.evidencia.findMany.mockResolvedValue([]);

    const progreso = await servicio.calcularProgresoPrograma('p1');

    expect(prisma.evidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { programaId: 'p1' } }),
    );
    expect(progreso.programaId).toBe('p1');
    expect(progreso.documentos.map((d) => d.codigoGuia)).toEqual(['G1', 'G2']);
    expect(progreso.avanceGlobal).toBe(0);
  });

  it('institución inexistente => 404', async () => {
    prisma.institucion.findUnique.mockResolvedValue(null);
    await expect(servicio.calcularProgresoInstitucion('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
