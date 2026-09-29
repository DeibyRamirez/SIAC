import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import JSZip from 'jszip';

import { DocumentosService } from './documentos.service';
import { ServicioManipulacionDocx } from '../docx/servicio-manipulacion-docx.service';
import { CODIGOS_CONDICION_DOCUMENTO_MAESTRO } from '../dominio/condiciones-documento-maestro';

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
            (e) =>
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
        .filter((e) => e.evidenciaId === evidenciaId)
        .sort(
          (a, b) =>
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
  };

  return repositorio;
}

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
  );
}

const revisor = { id: 'revisor-1', rol: RolUsuario.Revisor };

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
      async (_id, numero) =>
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
});
