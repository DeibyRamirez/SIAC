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
    {} as never,
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
    {} as never,
  );
  const revisor = { id: 'rev', rol: RolUsuario.Revisor };

  const esInstitucional = (codigoGuia: CodigoDocumentoGuia | null) =>
    codigoGuia === CodigoDocumentoGuia.G3 || codigoGuia === CodigoDocumentoGuia.G4;

  const evidenciaEnRevision = (codigoGuia: CodigoDocumentoGuia | null) => ({
    id: 'ev-1',
    nombre: 'Documento maestro Derecho',
    programaId: esInstitucional(codigoGuia) ? null : 'prog-1',
    institucionId: esInstitucional(codigoGuia) ? 'institucion-cuac' : null,
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
    alcance.estaAsignado.mockResolvedValue(false);

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
    // HU-010: el documento es de la institución; no se exige programa ni se recalcula
    // el avance de ninguna carrera.
    expect(alcance.estaAsignado).not.toHaveBeenCalled();
    expect(avancePrograma.recalcularPorcentajeAvance).not.toHaveBeenCalled();
  });

  it('G4 institucional: cualquier Revisor decide sin programa asignado', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G4));
    alcance.estaAsignado.mockResolvedValue(false);

    await servicio.dictaminar('ev-1', { estado: EstadoEvidencia.Validado }, revisor);

    expect(evidenciaRepo.actualizar).toHaveBeenCalledWith(
      'ev-1',
      expect.objectContaining({ estado: EstadoEvidencia.Validado }),
    );
    expect(alcance.estaAsignado).not.toHaveBeenCalled();
  });

  it('G1 de programa: recalcula el avance del programa', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G1));

    await servicio.dictaminar('ev-1', { condiciones: condicionesPrograma(9) }, revisor);

    expect(alcance.estaAsignado).toHaveBeenCalledWith('rev', 'prog-1');
    expect(avancePrograma.recalcularPorcentajeAvance).toHaveBeenCalledWith('prog-1');
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

describe('DocumentosService propietario de la evidencia (HU-010)', () => {
  const evidenciaRepo = {
    crear: jest.fn(),
    actualizar: jest.fn(),
    registrarVersion: jest.fn(),
    registrarHistorial: jest.fn(),
    buscarPorId: jest.fn(),
    eliminar: jest.fn(),
  };
  const almacenamiento = {
    generarClaveEvidencia: jest.fn().mockReturnValue('evidencias/clave.docx'),
    subirArchivo: jest.fn(),
  };
  const docx = { validarEsDocxZip: jest.fn() };
  const alcance = {
    estaAsignado: jest.fn(),
    idsProgramasAsignados: jest.fn(),
  };
  const instituciones = {
    obtenerPrincipal: jest.fn(),
    obtenerPorId: jest.fn(),
  };
  const servicio = new DocumentosService(
    evidenciaRepo as unknown as EvidenciaRepositorio,
    almacenamiento as never,
    {} as never,
    {} as never,
    docx as never,
    alcance as unknown as ServicioAlcancePrograma,
    instituciones as never,
  );
  const cargador = { id: 'car', rol: RolUsuario.Cargador };
  const archivo = {
    originalname: 'documento.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024,
    buffer: Buffer.from('PK'),
  } as Express.Multer.File;
  const base = {
    nombre: 'Documento maestro institucional',
    periodo: '2026-1',
    factor: 'CI',
    indicador: 'CI-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    evidenciaRepo.crear.mockResolvedValue({ id: 'ev-n' });
    evidenciaRepo.buscarPorId.mockResolvedValue({ id: 'ev-n' });
    instituciones.obtenerPrincipal.mockResolvedValue({ id: 'institucion-cuac' });
    alcance.idsProgramasAsignados.mockResolvedValue(['prog-1']);
    alcance.estaAsignado.mockResolvedValue(true);
  });

  it('G3 sin institución explícita se asocia a la CUAC y no a un programa', async () => {
    await servicio.crearConArchivo(
      { ...base, codigoGuia: CodigoDocumentoGuia.G3 },
      archivo,
      cargador,
    );

    const datos = evidenciaRepo.crear.mock.calls[0][0];
    expect(datos.institucion).toEqual({ connect: { id: 'institucion-cuac' } });
    expect(datos).not.toHaveProperty('programa');
    expect(alcance.estaAsignado).not.toHaveBeenCalled();
  });

  it('G4 con programa responde 400', async () => {
    await expect(
      servicio.crearConArchivo(
        { ...base, codigoGuia: CodigoDocumentoGuia.G4, programaId: 'prog-1' },
        archivo,
        cargador,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(evidenciaRepo.crear).not.toHaveBeenCalled();
  });

  it('un Cargador sin programas asignados no carga documentos institucionales', async () => {
    alcance.idsProgramasAsignados.mockResolvedValue([]);

    await expect(
      servicio.crearConArchivo(
        { ...base, codigoGuia: CodigoDocumentoGuia.G3 },
        archivo,
        cargador,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('G1 exige programa y no acepta institución', async () => {
    await expect(
      servicio.crearConArchivo({ ...base, codigoGuia: CodigoDocumentoGuia.G1 }, archivo, cargador),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      servicio.crearConArchivo(
        {
          ...base,
          codigoGuia: CodigoDocumentoGuia.G1,
          programaId: 'prog-1',
          institucionId: 'institucion-cuac',
        },
        archivo,
        cargador,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('G1 de un programa no asignado responde 403', async () => {
    alcance.estaAsignado.mockResolvedValue(false);

    await expect(
      servicio.crearConArchivo(
        { ...base, codigoGuia: CodigoDocumentoGuia.G1, programaId: 'prog-ajeno' },
        archivo,
        cargador,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('G1 de un programa asignado se asocia al programa', async () => {
    await servicio.crearConArchivo(
      { ...base, codigoGuia: CodigoDocumentoGuia.G1, programaId: 'prog-1' },
      archivo,
      cargador,
    );

    const datos = evidenciaRepo.crear.mock.calls[0][0];
    expect(datos.programa).toEqual({ connect: { id: 'prog-1' } });
    expect(datos).not.toHaveProperty('institucion');
  });
});

describe('DocumentosService lectura de documentos institucionales (HU-010)', () => {
  const evidenciaRepo = { buscarPorId: jest.fn() };
  const alcance = { estaAsignado: jest.fn() };
  const servicio = new DocumentosService(
    evidenciaRepo as unknown as EvidenciaRepositorio,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    alcance as unknown as ServicioAlcancePrograma,
    {} as never,
  );
  const institucional = (estado: EstadoEvidencia, autorId = 'car') => ({
    id: 'ev-g3',
    estado,
    autorId,
    programaId: null,
    institucionId: 'institucion-cuac',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    alcance.estaAsignado.mockResolvedValue(false);
  });

  it('el Revisor consulta un G3 enviado aunque no tenga programas en común', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(institucional(EstadoEvidencia.EnRevision));

    await expect(
      servicio.obtenerPorId('ev-g3', { id: 'rev', rol: RolUsuario.Revisor }),
    ).resolves.toMatchObject({ id: 'ev-g3' });
    expect(alcance.estaAsignado).not.toHaveBeenCalled();
  });

  it('el Revisor no consulta un G3 en borrador', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(institucional(EstadoEvidencia.Borrador));

    await expect(
      servicio.obtenerPorId('ev-g3', { id: 'rev', rol: RolUsuario.Revisor }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('otro Cargador no consulta el G3 de un compañero', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(institucional(EstadoEvidencia.EnRevision));

    await expect(
      servicio.obtenerPorId('ev-g3', { id: 'otro-cargador', rol: RolUsuario.Cargador }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el autor consulta su G3 sin depender de un programa', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(institucional(EstadoEvidencia.Borrador));

    await expect(
      servicio.obtenerPorId('ev-g3', { id: 'car', rol: RolUsuario.Cargador }),
    ).resolves.toMatchObject({ id: 'ev-g3' });
  });

  it('el Administrador consulta un G3 enviado', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(institucional(EstadoEvidencia.Cumple));

    await expect(
      servicio.obtenerPorId('ev-g3', { id: 'admin', rol: RolUsuario.Administrador }),
    ).resolves.toMatchObject({ id: 'ev-g3' });
  });
});
