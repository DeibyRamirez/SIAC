import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CodigoDocumentoGuia,
  EstadoEvidencia,
  TipoTramiteSIAC,
} from '@prisma/client';
import { InstitucionService } from './institucion.service';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';

describe('InstitucionService', () => {
  const institucion = {
    id: 'inst-cuac',
    nombre: 'CUAC',
    codigo: 'CUAC',
    tipoTramiteActivo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
    fechaResolucion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prisma = {
    institucion: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    evidencia: {
      findMany: jest.fn(),
    },
  };

  const avanceProceso = {
    calcularProgresoInstitucion: jest.fn(),
  } as unknown as AvanceProcesoSIACService;

  const servicio = new InstitucionService(prisma as never, avanceProceso);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.institucion.findFirst.mockResolvedValue(institucion);
    prisma.evidencia.findMany.mockResolvedValue([]);
    (avanceProceso.calcularProgresoInstitucion as jest.Mock).mockResolvedValue({
      programaId: institucion.id,
      tipoTramite: institucion.tipoTramiteActivo,
      avanceGlobal: 100,
      documentosAceptados: 2,
      documentosTotal: 2,
      documentos: [],
    });
  });

  it('activarVigencia persiste fechaResolucion cuando el avance es 100%', async () => {
    prisma.institucion.update.mockResolvedValue({
      ...institucion,
      fechaResolucion: new Date(),
    });

    await servicio.activarVigencia();

    expect(prisma.institucion.update).toHaveBeenCalledWith({
      where: { id: institucion.id },
      data: { fechaResolucion: expect.any(Date) },
    });
  });

  it('activarVigencia rechaza si el avance es menor a 100%', async () => {
    (avanceProceso.calcularProgresoInstitucion as jest.Mock).mockResolvedValue({
      programaId: institucion.id,
      tipoTramite: institucion.tipoTramiteActivo,
      avanceGlobal: 85,
      documentosAceptados: 1,
      documentosTotal: 2,
      documentos: [],
    });

    await expect(servicio.activarVigencia()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activarVigencia rechaza si ya estaba activa', async () => {
    prisma.institucion.findFirst.mockResolvedValue({
      ...institucion,
      fechaResolucion: new Date('2020-01-01'),
    });

    await expect(servicio.activarVigencia()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('obtener lanza 404 si no hay institución', async () => {
    prisma.institucion.findFirst.mockResolvedValue(null);
    await expect(servicio.obtener()).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AvanceProcesoSIACService institucional', () => {
  const prisma = {
    institucion: { findUnique: jest.fn() },
    tramiteDocumentoGuia: { findMany: jest.fn() },
    evidencia: { findMany: jest.fn() },
  };

  const servicio = new AvanceProcesoSIACService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.institucion.findUnique.mockResolvedValue({
      id: 'inst-cuac',
      tipoTramiteActivo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales,
    });
    prisma.tramiteDocumentoGuia.findMany.mockResolvedValue([
      { codigoGuia: CodigoDocumentoGuia.G3, pesoPorcentaje: 85 },
      { codigoGuia: CodigoDocumentoGuia.G4, pesoPorcentaje: 15 },
    ]);
    prisma.evidencia.findMany.mockResolvedValue([
      {
        codigoGuia: CodigoDocumentoGuia.G3,
        estado: EstadoEvidencia.Cumple,
        puntajeActual: 6,
        totalCondicionesActual: 6,
        updatedAt: new Date(),
      },
      {
        codigoGuia: CodigoDocumentoGuia.G4,
        estado: EstadoEvidencia.Cumple,
        puntajeActual: null,
        totalCondicionesActual: null,
        updatedAt: new Date(),
      },
    ]);
  });

  it('calcula progreso institucional G3+G4 con pesos 85/15', async () => {
    const progreso = await servicio.calcularProgresoInstitucion('inst-cuac');

    expect(progreso.avanceGlobal).toBe(100);
    expect(progreso.documentos).toHaveLength(2);
    expect(progreso.documentos.find((d) => d.codigoGuia === CodigoDocumentoGuia.G3)?.aportacion).toBe(
      85,
    );
    expect(progreso.documentos.find((d) => d.codigoGuia === CodigoDocumentoGuia.G4)?.aportacion).toBe(
      15,
    );
  });
});
