import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import { DocumentosService } from './documentos.service';
import { EvidenciaRepositorio } from './evidencia.repositorio';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';
import { CODIGOS_CONDICION_DOCUMENTO_MAESTRO } from '../dominio/condiciones-documento-maestro';
import { CODIGOS_CONDICION_INSTITUCIONAL } from '../dominio/condiciones-institucionales';
import JSZip from 'jszip';
import { ServicioManipulacionDocx } from '../docx/servicio-manipulacion-docx.service';


async function crearDocxBuffer(texto: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Prueba</dc:title></cp:coreProperties>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  );
  return Buffer.from(
    await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
  );
}

interface ComentarioFake {
  hunkId?: string;
  anchor?: string;
  quote?: string;
  texto: string;
}

interface EvaluacionFake {
  evidenciaId: string;
  numeroRevision: number;
  revisorId: string;
  codigoCondicion: string;
  cumple: boolean;
  observacion?: string;
}

function crearRepositorioFake() {
  const evaluaciones: EvaluacionFake[] = [];
  let evidencia = {
    id: 'ev-1',
    nombre: 'Documento Maestro',
    programaId: 'prog-1',
    autorId: 'autor-1',
    estado: EstadoEvidencia.EnRevision as EstadoEvidencia,
    version: 2,
    requiereChecklistMaestro: true,
    rutaArchivo: null as string | null,
    nombreArchivo: 'doc.docx',
    porcentajeCompletitud: 0,
  };

  const repositorio = {
    get evidencia() {
      return evidencia;
    },
    set evidencia(valor: typeof evidencia) {
      evidencia = valor;
    },
    evaluaciones,
    buscarPorId: jest.fn(async () => ({ ...evidencia })),
    actualizar: jest.fn(async (_id: string, datos: Record<string, unknown>) => {
      evidencia = { ...evidencia, ...datos } as typeof evidencia;
      return { ...evidencia };
    }),
    registrarHistorial: jest.fn(async () => ({})),
    guardarEvaluacionesCondicion: jest.fn(
      async (
        evidenciaId: string,
        numeroRevision: number,
        revisorId: string,
        filas: { codigoCondicion: string; cumple: boolean; observacion?: string }[],
      ) => {
        for (const fila of filas) {
          const existente = evaluaciones.find(
            (e: EvaluacionFake) =>
              e.evidenciaId === evidenciaId &&
              e.numeroRevision === numeroRevision &&
              e.codigoCondicion === fila.codigoCondicion,
          );
          if (existente) {
            Object.assign(existente, {
              cumple: fila.cumple,
              observacion: fila.observacion,
              revisorId,
            });
          } else {
            evaluaciones.push({
              evidenciaId,
              numeroRevision,
              revisorId,
              codigoCondicion: fila.codigoCondicion,
              cumple: fila.cumple,
              observacion: fila.observacion,
            });
          }
        }
      },
    ),
    listarEvaluacionesCondicion: jest.fn(async (evidenciaId: string) =>
      evaluaciones
        .filter((e: EvaluacionFake) => e.evidenciaId === evidenciaId)
        .sort(
          (a: EvaluacionFake, b: EvaluacionFake) =>
            b.numeroRevision - a.numeroRevision ||
            a.codigoCondicion.localeCompare(b.codigoCondicion),
        ),
    ),
    buscarVersion: jest.fn(async (_id: string, numero: number) => ({
      numero,
      rutaArchivo: 'evidencias/ev-1/v1/doc.docx',
      nombreArchivo: 'doc.docx',
      firmaDescarga: null as string | null,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })),
    listarComentariosVersion: jest.fn(
      async (_evidenciaId: string, _numeroVersion: number) =>
        [] as ComentarioFake[],
    ),
    listarComentariosHastaVersion: jest.fn(
      async (_evidenciaId: string, _numeroVersion: number) =>
        [] as ComentarioFake[],
    ),
    guardarComentariosVersion: jest.fn(async () => undefined),
    buscarUsuarioNombre: jest.fn(async () => ({ nombre: 'Revisor Prueba' })),
    actualizarVersion: jest.fn(async () => ({})),
    registrarVersion: jest.fn(async () => ({})),
    eliminarVersion: jest.fn(async () => ({})),
  };

  return repositorio;
}

const prismaFake = {
  institucion: { findFirst: jest.fn() },
} as never;

function crearServicio(repositorio: ReturnType<typeof crearRepositorioFake>) {
  return new DocumentosService(
    repositorio as never,
    {} as never,
    { crear: jest.fn() } as never,
    { recalcularPorcentajeAvance: jest.fn() } as never,
    {
      validarFirmaSubida: jest.fn(),
      procesarDocxPostDictamen: jest.fn(),
    } as never,
    {
      filtroVisibilidad: jest.fn(),
      estaAsignado: jest.fn().mockResolvedValue(true),
      idsProgramasAsignados: jest.fn(),
    } as never,
    prismaFake,
  );
}

const revisor = { id: 'revisor-1', rol: RolUsuario.Revisor };

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
    { institucion: { findFirst: jest.fn() } } as never,
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
    { institucion: { findFirst: jest.fn() } } as never,
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

  describe('G2/G4 sin puntaje (decisión del PO, 06/10)', () => {
    it('rechaza un dictamen con condiciones para G2', async () => {
      evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));

      await expect(
        servicio.dictaminar('ev-1', { condiciones: condicionesPrograma(7) }, revisor),
      ).rejects.toThrow(/no se evalúa por condiciones/);
      expect(evidenciaRepo.actualizar).not.toHaveBeenCalled();
    });

    it('«Con observaciones» exige texto de corrección', async () => {
      evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G4));

      await expect(
        servicio.dictaminar('ev-1', { estado: EstadoEvidencia.ConObservaciones }, revisor),
      ).rejects.toThrow(/texto de corrección/);
    });

    it('«Con observaciones» con texto queda sin puntaje y el cargador puede corregir', async () => {
      evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));

      await servicio.dictaminar(
        'ev-1',
        { estado: EstadoEvidencia.ConObservaciones, observaciones: 'Falta el plan de mejoramiento 2025.' },
        revisor,
      );

      const datos = evidenciaRepo.actualizar.mock.calls[0][1];
      expect(datos).toMatchObject({ estado: EstadoEvidencia.ConObservaciones });
      expect(datos).not.toHaveProperty('puntajeActual');
      expect(notificaciones.crear).toHaveBeenCalledWith('car', expect.stringContaining('plan de mejoramiento'), 'observaciones');
    });

    it('aprobar deja el G2 «Validado»; «Rechazado» ya no aplica', async () => {
      evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));
      await servicio.dictaminar('ev-1', { estado: EstadoEvidencia.Validado }, revisor);
      expect(evidenciaRepo.actualizar.mock.calls[0][1]).toMatchObject({ estado: EstadoEvidencia.Validado });

      evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));
      await expect(
        servicio.dictaminar('ev-1', { estado: EstadoEvidencia.Rechazado, observaciones: 'x' }, revisor),
      ).rejects.toThrow(/Validado.*Con observaciones/);
    });
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

  it('evidencia sin guía (legado): Rechazado solo sale de la decisión explícita del Revisor', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(null));

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

  it('G2 no acepta «Cumple» como decisión (no tiene puntaje)', async () => {
    evidenciaRepo.buscarPorId.mockResolvedValue(evidenciaEnRevision(CodigoDocumentoGuia.G2));

    await expect(
      servicio.dictaminar('ev-1', { estado: EstadoEvidencia.Cumple }, revisor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('DocumentosService · checklist Documento Maestro entre ciclos', () => {
  it('conserva los Correcto y deja pendientes las Corregir en el siguiente ciclo', async () => {
    const repositorio = crearRepositorioFake();
    const servicio = crearServicio(repositorio);

    const condicionesIniciales = CODIGOS_CONDICION_DOCUMENTO_MAESTRO.map(
      (codigo, indice) => ({
        codigo,
        cumple: indice < 7,
        observacion: indice < 7 ? undefined : `Corregir ${codigo}`,
      }),
    );

    await servicio.dictaminar('ev-1', { condiciones: condicionesIniciales }, revisor);

    const primerDictamen = await servicio.obtenerEvaluacionesCondicion('ev-1', revisor);
    expect(primerDictamen).toHaveLength(9);
    expect(primerDictamen.filter((e) => e.cumple)).toHaveLength(7);
    const pendientes = primerDictamen.filter((e) => !e.cumple);
    expect(pendientes).toHaveLength(2);
    expect(pendientes.every((e) => e.observacion)).toBe(true);

    repositorio.evidencia = {
      ...repositorio.evidencia,
      version: 3,
      estado: EstadoEvidencia.EnRevision,
    };

    const trasNuevaVersion = await servicio.obtenerEvaluacionesCondicion('ev-1', revisor);
    expect(trasNuevaVersion.filter((e) => e.cumple)).toHaveLength(7);
    expect(trasNuevaVersion.filter((e) => !e.cumple)).toHaveLength(2);
  });
});

describe('DocumentosService · descarga con comentarios del revisor', () => {
  it('sirve el buffer con comentarios inyectados y firma única persistida', async () => {
    const repositorio = crearRepositorioFake();
    repositorio.evidencia = {
      ...repositorio.evidencia,
      estado: EstadoEvidencia.Rechazado,
      version: 1,
      requiereChecklistMaestro: false,
      rutaArchivo: 'evidencias/ev-1/v1/doc.docx',
    };
    repositorio.buscarVersion.mockResolvedValue({
      numero: 1,
      rutaArchivo: 'evidencias/ev-1/v1/doc.docx',
      nombreArchivo: 'doc.docx',
      firmaDescarga: null,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    repositorio.listarComentariosHastaVersion.mockResolvedValue([
      { quote: 'requisitos de calidad', texto: 'Aclarar este punto' },
    ]);

    const bufferBase = await crearDocxBuffer(
      'El programa cumple con los requisitos de calidad.',
    );
    const docx = new ServicioManipulacionDocx();
    const servicio = new DocumentosService(
      repositorio as never,
      { obtenerBuffer: jest.fn(async () => bufferBase) } as never,
      { crear: jest.fn() } as never,
      { recalcularPorcentajeAvance: jest.fn() } as never,
      docx as never,
      {
        filtroVisibilidad: jest.fn(),
        estaAsignado: jest.fn().mockResolvedValue(true),
        idsProgramasAsignados: jest.fn(),
      } as never,
      prismaFake,
    );

    const { buffer } = await servicio.obtenerContenidoArchivo('ev-1', revisor, 1);

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('word/comments.xml')).not.toBeNull();
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('<w:commentRangeStart');
    expect(documentXml).toContain('<w:commentReference');

    const firma = await docx.leerFirmaDocumento(buffer);
    expect(firma).not.toBeNull();
    expect(repositorio.actualizarVersion).toHaveBeenCalledWith(
      'ev-1',
      1,
      expect.objectContaining({ firmaDescarga: firma }),
    );
  });

  it('persiste los comentarios con el número de versión dictaminada (v2)', async () => {
    const repositorio = crearRepositorioFake();
    repositorio.evidencia = {
      ...repositorio.evidencia,
      estado: EstadoEvidencia.EnRevision,
      version: 2,
      requiereChecklistMaestro: false,
    };
    const servicio = crearServicio(repositorio);

    await servicio.dictaminar(
      'ev-1',
      {
        estado: EstadoEvidencia.Rechazado,
        comentariosInline: [
          { hunkId: undefined, anchor: '10:25', quote: 'texto citado v2', texto: 'Corregir v2' },
        ],
      },
      revisor,
    );

    expect(repositorio.guardarComentariosVersion).toHaveBeenCalledWith(
      'ev-1',
      2,
      'revisor-1',
      [
        expect.objectContaining({
          quote: 'texto citado v2',
          texto: 'Corregir v2',
          anchor: '10:25',
          autor: 'Revisor Prueba',
        }),
      ],
    );
  });

  it('descarga v2 inyecta solo los comentarios de v2, no los de v1', async () => {
    const repositorio = crearRepositorioFake();
    repositorio.evidencia = {
      ...repositorio.evidencia,
      estado: EstadoEvidencia.Rechazado,
      version: 2,
      requiereChecklistMaestro: false,
      rutaArchivo: 'evidencias/ev-1/v2/doc.docx',
    };
    repositorio.buscarVersion.mockResolvedValue({
      numero: 2,
      rutaArchivo: 'evidencias/ev-1/v2/doc.docx',
      nombreArchivo: 'doc-v2.docx',
      firmaDescarga: null,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    repositorio.listarComentariosHastaVersion.mockImplementation(
      async (_id: string, numero: number) =>
        numero >= 2
          ? [
              { quote: 'requisitos de calidad', texto: 'Observación de la v1' },
              { quote: 'requisitos de calidad', texto: 'Observación de la v2' },
            ]
          : [{ quote: 'requisitos de calidad', texto: 'Observación vieja de la v1' }],
    );

    const bufferBase = await crearDocxBuffer(
      'El programa cumple con los requisitos de calidad.',
    );
    const docx = new ServicioManipulacionDocx();
    const servicio = new DocumentosService(
      repositorio as never,
      { obtenerBuffer: jest.fn(async () => bufferBase) } as never,
      { crear: jest.fn() } as never,
      { recalcularPorcentajeAvance: jest.fn() } as never,
      docx as never,
      {
        filtroVisibilidad: jest.fn(),
        estaAsignado: jest.fn().mockResolvedValue(true),
        idsProgramasAsignados: jest.fn(),
      } as never,
      prismaFake,
    );

    const { buffer } = await servicio.obtenerContenidoArchivo('ev-1', revisor, 2);
    expect(repositorio.listarComentariosHastaVersion).toHaveBeenCalledWith('ev-1', 2);

    const zip = await JSZip.loadAsync(buffer);
    const comments = await zip.file('word/comments.xml')!.async('string');
    expect(comments).toContain('Observación de la v1');
    expect(comments).toContain('Observación de la v2');
    expect(comments).not.toContain('Observación vieja de la v1');
    // Ambas anclas y referencias presentes.
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect((documentXml.match(/<w:commentRangeStart/g) ?? []).length).toBe(2);
    expect((documentXml.match(/<w:commentReference/g) ?? []).length).toBe(2);
  });

  it('persiste los 3 comentarios inline del dictamen en v1', async () => {
    const repositorio = crearRepositorioFake();
    repositorio.evidencia = {
      ...repositorio.evidencia,
      estado: EstadoEvidencia.EnRevision,
      version: 1,
      requiereChecklistMaestro: false,
    };
    const servicio = crearServicio(repositorio);

    await servicio.dictaminar(
      'ev-1',
      {
        estado: EstadoEvidencia.Rechazado,
        comentariosInline: [
          { anchor: '0:5', quote: 'David', texto: 'Nombre completo' },
          { anchor: '10:30', quote: 'requisitos de calidad', texto: 'Aclarar' },
          { quote: 'informe final', texto: 'Revisar' },
        ],
      },
      revisor,
    );

    expect(repositorio.guardarComentariosVersion).toHaveBeenCalledTimes(1);
    const llamada = repositorio.guardarComentariosVersion.mock.calls[0] as unknown as [
      string,
      number,
      string,
      { texto: string; autor?: string }[],
    ];
    expect(llamada[0]).toBe('ev-1');
    expect(llamada[1]).toBe(1);
    expect(llamada[3]).toHaveLength(3);
    expect(llamada[3].map((c) => c.texto)).toEqual([
      'Nombre completo',
      'Aclarar',
      'Revisar',
    ]);
    expect(llamada[3].every((c) => c.autor === 'Revisor Prueba')).toBe(true);
  });

  it('reemplazarArchivo conserva el nombre original del .docx y no adopta "(2).docx"', async () => {
    const repositorio = crearRepositorioFake();
    repositorio.evidencia = {
      ...repositorio.evidencia,
      estado: EstadoEvidencia.Rechazado,
      version: 1,
      requiereChecklistMaestro: false,
      autorId: 'autor-1',
      nombreArchivo: 'guia.docx',
      rutaArchivo: 'evidencias/2026/ev-1/v1/guia.docx',
    };
    repositorio.buscarVersion.mockResolvedValue({
      numero: 1,
      rutaArchivo: 'evidencias/2026/ev-1/v1/guia.docx',
      nombreArchivo: 'guia.docx',
      firmaDescarga: 'firma-v1',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const generarClaveEvidencia = jest.fn(
      (_id: string, nombre: string, version: number) =>
        `evidencias/2026/ev-1/v${version}/${nombre}`,
    );
    const servicio = new DocumentosService(
      repositorio as never,
      {
        obtenerBuffer: jest.fn(),
        subirArchivo: jest.fn(),
        generarClaveEvidencia,
      } as never,
      { crear: jest.fn() } as never,
      { recalcularPorcentajeAvance: jest.fn() } as never,
      {
        validarFirmaSubida: jest.fn(),
        validarEsDocxZip: jest.fn(),
        procesarDocxPostDictamen: jest.fn(),
      } as never,
      {
        filtroVisibilidad: jest.fn(),
        estaAsignado: jest.fn().mockResolvedValue(true),
        idsProgramasAsignados: jest.fn(),
      } as never,
      prismaFake,
    );

    await servicio.reemplazarArchivo(
      'ev-1',
      {
        originalname: 'guia (2).docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: await crearDocxBuffer('contenido corregido'),
        size: 120,
      } as never,
      { id: 'autor-1', rol: RolUsuario.Cargador },
    );

    expect(generarClaveEvidencia).toHaveBeenCalledWith('ev-1', 'guia.docx', 2);
    expect(repositorio.registrarVersion).toHaveBeenCalledWith(
      expect.objectContaining({ numero: 2, nombreArchivo: 'guia.docx' }),
    );
    expect(repositorio.actualizar).toHaveBeenCalledWith(
      'ev-1',
      expect.objectContaining({ nombreArchivo: 'guia.docx' }),
    );
  });
});

describe('DocumentosService propietario de la evidencia (HU-010)', () => {
  const evidenciaRepo = {
    crear: jest.fn(),
    actualizar: jest.fn(),
    registrarVersion: jest.fn(),
    registrarHistorial: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPrograma: jest.fn(),
    buscarDocumentoRequerido: jest.fn(),
    eliminar: jest.fn(),
  };
  const almacenamiento = {
    generarClaveEvidencia: jest.fn().mockReturnValue('evidencias/clave.docx'),
    subirArchivo: jest.fn(),
  };
  const alcance = {
    estaAsignado: jest.fn(),
    idsProgramasAsignados: jest.fn(),
  };
  const prisma = {
    institucion: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  const servicio = new DocumentosService(
    evidenciaRepo as unknown as EvidenciaRepositorio,
    almacenamiento as never,
    {} as never,
    {} as never,
    { validarEsDocxZip: jest.fn() } as never,
    alcance as unknown as ServicioAlcancePrograma,
    prisma as never,
  );
  const cargador = { id: 'car', rol: RolUsuario.Cargador };
  const archivo = {
    originalname: 'documento.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024,
    buffer: Buffer.from('PK'),
  } as Express.Multer.File;
  const base = { nombre: 'Condiciones institucionales', periodo: '2026-1' };

  beforeEach(() => {
    jest.clearAllMocks();
    evidenciaRepo.crear.mockResolvedValue({ id: 'ev-n' });
    evidenciaRepo.buscarPorId.mockResolvedValue({ id: 'ev-n' });
    evidenciaRepo.buscarPrograma.mockResolvedValue({ id: 'prog-1' });
    prisma.institucion.findFirst.mockResolvedValue({ id: 'inst-cuac' });
    prisma.institucion.findUnique.mockResolvedValue(null);
    alcance.idsProgramasAsignados.mockResolvedValue(['prog-1']);
    alcance.estaAsignado.mockResolvedValue(true);
  });

  it('G3 sin programa se asocia a la CUAC y no a un programa', async () => {
    await servicio.crearConArchivo({ ...base, codigoGuia: CodigoDocumentoGuia.G3 }, archivo, cargador);

    const datos = evidenciaRepo.crear.mock.calls[0][0];
    expect(datos.institucion).toEqual({ connect: { id: 'inst-cuac' } });
    expect(datos).not.toHaveProperty('programa');
    expect(alcance.estaAsignado).not.toHaveBeenCalled();
    expect(evidenciaRepo.buscarPrograma).not.toHaveBeenCalled();
  });

  it('G4 con institución explícita inexistente responde 400', async () => {
    await expect(
      servicio.crearConArchivo(
        { ...base, codigoGuia: CodigoDocumentoGuia.G4, institucionId: 'no-existe' },
        archivo,
        cargador,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(evidenciaRepo.crear).not.toHaveBeenCalled();
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
      servicio.crearConArchivo({ ...base, codigoGuia: CodigoDocumentoGuia.G3 }, archivo, cargador),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('G1 exige programa y no acepta institución', async () => {
    await expect(
      servicio.crearConArchivo({ ...base, codigoGuia: CodigoDocumentoGuia.G1 }, archivo, cargador),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      servicio.crearConArchivo(
        { ...base, codigoGuia: CodigoDocumentoGuia.G1, programaId: 'prog-1', institucionId: 'inst-cuac' },
        archivo,
        cargador,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(evidenciaRepo.crear).not.toHaveBeenCalled();
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

  it('G2 de un programa asignado se asocia al programa', async () => {
    await servicio.crearConArchivo(
      { ...base, codigoGuia: CodigoDocumentoGuia.G2, programaId: 'prog-1' },
      archivo,
      cargador,
    );

    const datos = evidenciaRepo.crear.mock.calls[0][0];
    expect(datos.programa).toEqual({ connect: { id: 'prog-1' } });
    expect(datos).not.toHaveProperty('institucion');
    expect(prisma.institucion.findFirst).not.toHaveBeenCalled();
  });
});
