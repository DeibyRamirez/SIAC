import { ForbiddenException } from '@nestjs/common';
import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';

describe('DocumentosService permisos de revisión', () => {
  const evidenciaRepo = {
    buscarPorId: jest.fn(),
    listarEnviosRevisionParaRevisor: jest.fn(),
  };
  const alcance = {
    estaAsignado: jest.fn(),
    idsProgramasAsignados: jest.fn(),
    filtroVisibilidad: jest.fn(),
  };
  const servicio = new DocumentosService(
    evidenciaRepo as unknown as EvidenciaRepositorio,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    alcance as unknown as ServicioAlcancePrograma,
  );

  beforeEach(() => jest.clearAllMocks());

  it('el administrador no dictamina', async () => {
    await expect(
      servicio.dictaminar(
        'ev-1',
        { estado: EstadoEvidencia.Validado },
        { id: 'admin', rol: RolUsuario.Administrador },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(evidenciaRepo.buscarPorId).not.toHaveBeenCalled();
  });

  it('el revisor de otro programa recibe 403', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue({
      id: 'ev-1',
      programaId: 'prog-ajeno',
      estado: EstadoEvidencia.EnRevision,
    });
    alcance.estaAsignado.mockResolvedValue(false);

    await expect(
      servicio.dictaminar(
        'ev-1',
        { estado: EstadoEvidencia.Validado },
        { id: 'rev', rol: RolUsuario.Revisor },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mis revisiones quedan acotadas a los programas del revisor', async () => {
    alcance.idsProgramasAsignados.mockResolvedValue(['prog-1']);
    evidenciaRepo.listarEnviosRevisionParaRevisor.mockResolvedValue({ datos: [], total: 0 });

    await servicio.listarMisRevisionesRevisor({ id: 'rev', rol: RolUsuario.Revisor }, 1, 10);

    expect(evidenciaRepo.listarEnviosRevisionParaRevisor).toHaveBeenCalledWith(1, 10, ['prog-1']);
  });

  it('el administrador no consulta mis revisiones', async () => {
    await expect(
      servicio.listarMisRevisionesRevisor({ id: 'admin', rol: RolUsuario.Administrador }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
