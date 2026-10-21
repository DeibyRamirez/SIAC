import { ForbiddenException } from '@nestjs/common';
import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';

/**
 * Regla de borradores (20/10/2026): solo quien subió el documento ve su Borrador. Aplica a
 * detalle, historial, versiones, comentarios, comparación, descarga y URL firmada, también para
 * Administrador y SuperAdmin. La parte RLS queda en docs/plan-rls (pendiente).
 */
describe('DocumentosService · borradores privados del autor', () => {
  const borrador = {
    id: 'ev-1',
    estado: EstadoEvidencia.Borrador,
    autorId: 'cargador-1',
    programaId: 'p1',
    institucionId: null,
    rutaArchivo: 'p1/ev-1/v1.docx',
    nombreArchivo: 'g1.docx',
    mimeType: 'application/pdf',
    version: 1,
  };
  const evidenciaRepo = {
    buscarPorId: jest.fn(),
    obtenerHistorial: jest.fn().mockResolvedValue([]),
    listarVersiones: jest.fn().mockResolvedValue([]),
    buscarVersion: jest.fn().mockResolvedValue({ rutaArchivo: 'p1/ev-1/v1.docx', numero: 1 }),
    listarComentariosVersion: jest.fn().mockResolvedValue([]),
  };
  const almacenamiento = { generarUrlFirmada: jest.fn().mockResolvedValue('https://firmada') };
  const alcance = {
    estaAsignado: jest.fn().mockResolvedValue(true),
    idsProgramasAsignados: jest.fn().mockResolvedValue(['p1']),
    esResponsableProcesoInstitucional: jest.fn().mockResolvedValue(false),
  };
  const servicio = new DocumentosService(
    evidenciaRepo as unknown as EvidenciaRepositorio,
    almacenamiento as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    alcance as unknown as ServicioAlcancePrograma,
    {} as never,
  );

  const ajenos = [
    { id: 'admin', rol: RolUsuario.Administrador },
    { id: 'super', rol: RolUsuario.SuperAdmin },
    { id: 'revisor', rol: RolUsuario.Revisor },
    { id: 'cargador-2', rol: RolUsuario.Cargador },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    evidenciaRepo.buscarPorId.mockResolvedValue({ ...borrador });
  });

  it.each(ajenos)('$rol no consulta un borrador ajeno (detalle, historial, versiones, comentarios)', async (usuario) => {
    await expect(servicio.obtenerPorId('ev-1', usuario)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.obtenerHistorial('ev-1', usuario)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.listarVersiones('ev-1', usuario)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.listarComentarios('ev-1', usuario)).rejects.toBeInstanceOf(ForbiddenException);
    expect(evidenciaRepo.obtenerHistorial).not.toHaveBeenCalled();
    expect(evidenciaRepo.listarVersiones).not.toHaveBeenCalled();
  });

  it.each(ajenos)('$rol no obtiene URL firmada ni versión de un borrador ajeno', async (usuario) => {
    await expect(servicio.obtenerUrlDescarga('ev-1', usuario)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.obtenerUrlDescarga('ev-1', usuario, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(almacenamiento.generarUrlFirmada).not.toHaveBeenCalled();
  });

  it('el autor sí consulta y descarga su propio borrador', async () => {
    const autor = { id: 'cargador-1', rol: RolUsuario.Cargador };
    await expect(servicio.obtenerPorId('ev-1', autor)).resolves.toMatchObject({ id: 'ev-1' });
    await expect(servicio.obtenerHistorial('ev-1', autor)).resolves.toEqual([]);
    await expect(servicio.obtenerUrlDescarga('ev-1', autor)).resolves.toBe('https://firmada');
  });

  it('un borrador que ya pasó por revisión sigue siendo privado (sin excepción por historial)', async () => {
    await expect(
      servicio.obtenerPorId('ev-1', { id: 'admin', rol: RolUsuario.Administrador }),
    ).rejects.toThrow('El borrador solo lo consulta quien lo subió.');
  });

  it('fuera de Borrador el Administrador consulta y descarga como antes', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue({ ...borrador, estado: EstadoEvidencia.EnRevision });
    const admin = { id: 'admin', rol: RolUsuario.Administrador };
    await expect(servicio.obtenerPorId('ev-1', admin)).resolves.toMatchObject({ id: 'ev-1' });
    await expect(servicio.obtenerUrlDescarga('ev-1', admin)).resolves.toBe('https://firmada');
  });
});
