import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';
import { CODIGOS_CONDICION_DOCUMENTO_MAESTRO } from '../dominio/condiciones-documento-maestro';
import { CODIGOS_CONDICION_INSTITUCIONAL } from '../dominio/condiciones-institucionales';

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

describe('DocumentosService dictamen con checklist (regla n/9, HU-003)', () => {
  const evidenciaRepo = {
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    registrarHistorial: jest.fn(),
    guardarEvaluacionesCondicion: jest.fn(),
    guardarEvaluacionesCondicionInstitucional: jest.fn(),
  };
  const notificaciones = { crear: jest.fn() };
  const avancePrograma = { recalcularPorcentajeAvance: jest.fn() };
  const alcance = { estaAsignado: jest.fn() };
  const servicio = new DocumentosService(
    evidenciaRepo as unknown as EvidenciaRepositorio,
    {} as never,
    notificaciones as never,
    avancePrograma as never,
    {} as never,
    alcance as unknown as ServicioAlcancePrograma,
  );
  const revisor = { id: 'rev', rol: RolUsuario.Revisor };

  const evidenciaEnRevision = (codigoGuia: CodigoDocumentoGuia | null) => ({
    id: 'ev-1',
    nombre: 'Documento maestro Derecho',
    programaId: 'prog-1',
    autorId: 'car',
    estado: EstadoEvidencia.EnRevision,
    version: 1,
    codigoGuia,
    requiereChecklistMaestro: codigoGuia === CodigoDocumentoGuia.G1,
    rutaArchivo: null,
  });

  const condicionesPrograma = (cumplen: number) =>
    CODIGOS_CONDICION_DOCUMENTO_MAESTRO.map((codigo, indice) => ({
      codigo,
      cumple: indice < cumplen,
      observacion: indice < cumplen ? undefined : 'Falta evidencia de soporte.',
    }));

  const condicionesInstitucionales = (cumplen: number) =>
    CODIGOS_CONDICION_INSTITUCIONAL.map((codigo, indice) => ({
      codigo,
      cumple: indice < cumplen,
      observacion: indice < cumplen ? undefined : 'Falta evidencia de soporte.',
    }));

  beforeEach(() => {
    jest.clearAllMocks();
    alcance.estaAsignado.mockResolvedValue(true);
  });

  it('5 de 9 condiciones => puntaje 5, estado Con observaciones (no Rechazado)', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G1));

    await servicio.dictaminar('ev-1', { condiciones: condicionesPrograma(5) }, revisor);

    expect(evidenciaRepo.actualizar).toHaveBeenCalledWith(
      'ev-1',
      expect.objectContaining({
        estado: EstadoEvidencia.ConObservaciones,
        puntajeActual: 5,
        totalCondicionesActual: 9,
      }),
    );
    const datos = evidenciaRepo.actualizar.mock.calls[0][1];
    expect(datos).not.toHaveProperty('porcentajeCompletitud');
    expect(evidenciaRepo.registrarHistorial).toHaveBeenCalledWith(
      'ev-1',
      EstadoEvidencia.ConObservaciones,
      expect.any(String),
      'rev',
    );
    expect(notificaciones.crear).toHaveBeenCalledWith(
      'car',
      expect.stringContaining('(5/9)'),
      'observaciones',
    );
  });

  it('9 de 9 condiciones => estado Cumple (no Validado)', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G1));

    await servicio.dictaminar('ev-1', { condiciones: condicionesPrograma(9) }, revisor);

    expect(evidenciaRepo.actualizar).toHaveBeenCalledWith(
      'ev-1',
      expect.objectContaining({
        estado: EstadoEvidencia.Cumple,
        puntajeActual: 9,
        totalCondicionesActual: 9,
      }),
    );
  });

  it('el checklist ignora un estado Rechazado enviado por el cliente', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G1));

    await servicio.dictaminar(
      'ev-1',
      { estado: EstadoEvidencia.Rechazado, condiciones: condicionesPrograma(8) },
      revisor,
    );

    expect(evidenciaRepo.actualizar).toHaveBeenCalledWith(
      'ev-1',
      expect.objectContaining({ estado: EstadoEvidencia.ConObservaciones, puntajeActual: 8 }),
    );
  });

  it('G3 institucional: 6/6 => Cumple y 4/6 => Con observaciones', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G3));

    await servicio.dictaminar(
      'ev-1',
      { condicionesInstitucionales: condicionesInstitucionales(6) },
      revisor,
    );
    expect(evidenciaRepo.actualizar).toHaveBeenLastCalledWith(
      'ev-1',
      expect.objectContaining({
        estado: EstadoEvidencia.Cumple,
        puntajeActual: 6,
        totalCondicionesActual: 6,
      }),
    );

    await servicio.dictaminar(
      'ev-1',
      { condicionesInstitucionales: condicionesInstitucionales(4) },
      revisor,
    );
    expect(evidenciaRepo.actualizar).toHaveBeenLastCalledWith(
      'ev-1',
      expect.objectContaining({
        estado: EstadoEvidencia.ConObservaciones,
        puntajeActual: 4,
        totalCondicionesActual: 6,
      }),
    );
  });

  it('exige observación en cada condición que no cumple', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G1));
    const condiciones = condicionesPrograma(8).map((c) => ({ ...c, observacion: undefined }));

    await expect(
      servicio.dictaminar('ev-1', { condiciones }, revisor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(evidenciaRepo.actualizar).not.toHaveBeenCalled();
  });

  it('exige las 9 condiciones del documento maestro', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G1));

    await expect(
      servicio.dictaminar('ev-1', { condiciones: condicionesPrograma(9).slice(0, 8) }, revisor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sin checklist, Rechazado solo sale de la decisión explícita del Revisor', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));

    await servicio.dictaminar(
      'ev-1',
      { estado: EstadoEvidencia.Rechazado, observaciones: 'No corresponde al periodo.' },
      revisor,
    );

    expect(evidenciaRepo.actualizar).toHaveBeenCalledWith(
      'ev-1',
      expect.objectContaining({ estado: EstadoEvidencia.Rechazado }),
    );
    const datos = evidenciaRepo.actualizar.mock.calls[0][1];
    expect(datos).not.toHaveProperty('puntajeActual');
  });

  it('sin checklist no acepta Cumple ni Con observaciones como decisión', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));

    await expect(
      servicio.dictaminar('ev-1', { estado: EstadoEvidencia.Cumple }, revisor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
