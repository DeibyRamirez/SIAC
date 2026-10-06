import { NotFoundException } from '@nestjs/common';
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

  it('sin resolución y al 100% indica que falta la resolución MEN (ya no «activar vigencia»)', async () => {
    const resultado = await servicio.obtener();
    expect(resultado.estadoProceso).toBe('Completado — pendiente resolución MEN');
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
