import { CodigoDocumentoGuia, Prisma, RolUsuario } from '@prisma/client';
import { BusquedaService } from './busqueda.service';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';
import { EvidenciaRepositorio } from '../documentos/evidencia.repositorio';

describe('BusquedaService filtros HU-008', () => {
  const prisma = {
    evidencia: { findMany: jest.fn() },
    plantilla: { findMany: jest.fn() },
    anexoVigencia: { findMany: jest.fn() },
  };
  const alcance = {
    filtroVisibilidad: jest.fn(),
    idsProgramasAsignados: jest.fn(),
  };
  const evidenciaRepo = { listar: jest.fn() };

  const servicio = new BusquedaService(
    prisma as never,
    alcance as unknown as ServicioAlcancePrograma,
    evidenciaRepo as unknown as EvidenciaRepositorio,
  );

  const admin = { id: 'admin', rol: RolUsuario.Administrador };
  const cargador = { id: 'car-1', rol: RolUsuario.Cargador };

  beforeEach(() => {
    jest.clearAllMocks();
    evidenciaRepo.listar.mockResolvedValue([[], 0]);
    alcance.filtroVisibilidad.mockResolvedValue({});
  });

  it('delega en EvidenciaRepositorio con programa slug y puntajeMin', async () => {
    await servicio.buscar({ programa: 'derecho', puntajeMin: '5' }, admin);

    expect(evidenciaRepo.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        programaSlug: 'derecho',
        puntajeMin: 5,
        usarFts: true,
      }),
    );
  });

  it('aplica alcance del cargador en cada búsqueda', async () => {
    const visibilidad: Prisma.EvidenciaWhereInput = {
      autorId: 'car-1',
      programaId: { in: ['prog-1'] },
    };
    alcance.filtroVisibilidad.mockResolvedValue(visibilidad);

    await servicio.buscar({ q: 'informe' }, cargador);

    expect(evidenciaRepo.listar).toHaveBeenCalledWith(
      expect.objectContaining({ alcance: visibilidad }),
    );
  });

  it('filtra por codigoGuia exacto', async () => {
    await servicio.buscar(
      { codigoGuia: CodigoDocumentoGuia.G1, programaId: 'prog-1' },
      admin,
    );

    expect(evidenciaRepo.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoGuia: CodigoDocumentoGuia.G1,
        programaId: 'prog-1',
      }),
    );
  });

  it('el texto libre activa FTS', async () => {
    await servicio.buscar({ busqueda: 'g3' }, admin);

    expect(evidenciaRepo.listar).toHaveBeenCalledWith(
      expect.objectContaining({ busqueda: 'g3', usarFts: true }),
    );
  });
});
