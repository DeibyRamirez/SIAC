import { BadGatewayException, BadRequestException, ConflictException } from '@nestjs/common';
import { TipoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { UMBRALES_SEMAFORO_DEFECTO } from '../dominio/panel-siac';
import { ResolucionMenService } from './resolucion-men.service';

const PDF = Buffer.from('%PDF-1.7\n%%EOF');

function archivo(parcial: Partial<Express.Multer.File> = {}): Express.Multer.File {
  const buffer = parcial.buffer ?? PDF;
  return {
    originalname: 'Resolucion-12345.pdf',
    mimetype: 'application/pdf',
    buffer,
    size: buffer.length,
    ...parcial,
  } as Express.Multer.File;
}

function progreso(pendientes: string[]) {
  return {
    programaId: 'p1',
    tipoTramite: TipoTramiteSIAC.RenovacionRegistroCalificado,
    avanceGlobal: pendientes.length ? 90 : 100,
    documentosAceptados: 2 - pendientes.length,
    documentosTotal: 2,
    documentos: [],
    documentosPendientes: pendientes,
    puedeCargarResolucion: pendientes.length === 0,
  };
}

describe('ResolucionMenService', () => {
  const tx = {
    evidencia: { create: jest.fn().mockResolvedValue({ id: 'ev1' }) },
    resolucionMen: { create: jest.fn() },
    programa: { update: jest.fn() },
    institucion: { update: jest.fn() },
  };
  const prisma = {
    programa: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'p1',
        nombre: 'Derecho',
        tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
      }),
    },
    institucion: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const almacenamiento = {
    generarClaveDocumento: jest.fn().mockReturnValue('documentos/resoluciones-men/u/Resolucion-12345.pdf'),
    subirArchivo: jest.fn().mockResolvedValue(undefined),
    eliminarArchivo: jest.fn().mockResolvedValue(undefined),
  };
  const avance = { calcularProgresoPrograma: jest.fn(), calcularProgresoInstitucion: jest.fn() };
  const configuracion = { obtener: () => UMBRALES_SEMAFORO_DEFECTO };
  const servicio = new ResolucionMenService(
    prisma as never,
    almacenamiento as never,
    avance as never,
    configuracion as never,
  );
  const dto = { numero: '12345', fechaResolucion: '2020-03-01' };
  const usuario = { id: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    avance.calcularProgresoPrograma.mockResolvedValue(progreso([]));
    tx.resolucionMen.create.mockImplementation(({ data }) => Promise.resolve({ id: 'r1', ...data }));
    jest.useFakeTimers({ now: new Date('2026-10-06T12:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  });

  afterEach(() => jest.useRealTimers());

  it('409 si el trámite tiene documentos pendientes; no sube nada', async () => {
    avance.calcularProgresoPrograma.mockResolvedValue(progreso(['G2']));
    await expect(servicio.cargarParaPrograma('p1', dto, archivo(), usuario)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(almacenamiento.subirArchivo).not.toHaveBeenCalled();
  });

  it('400 con PDF falso o .docx', async () => {
    await expect(
      servicio.cargarParaPrograma('p1', dto, archivo({ buffer: Buffer.from('PK\u0003\u0004') }), usuario),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.cargarParaPrograma('p1', dto, archivo({ originalname: 'resolucion.docx' }), usuario),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(almacenamiento.subirArchivo).not.toHaveBeenCalled();
  });

  it('400 con fecha futura o inválida', async () => {
    await expect(
      servicio.cargarParaPrograma('p1', { ...dto, fechaResolucion: '2027-01-01' }, archivo(), usuario),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.cargarParaPrograma('p1', { ...dto, fechaResolucion: '2020-02-30' }, archivo(), usuario),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fecha 2020-03-01 → fin 2027-03-01 y semáforo Amarillo el 06/10/2026; guarda evidencia y fecha real', async () => {
    const resultado = await servicio.cargarParaPrograma('p1', dto, archivo(), usuario);

    expect(resultado.fechaFinVigencia.toISOString().slice(0, 10)).toBe('2027-03-01');
    expect(resultado.semaforoVigencia).toBe('Amarillo');
    expect(tx.evidencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoEvidencia: TipoEvidencia.ResolucionMen,
        programaId: 'p1',
        mimeType: 'application/pdf',
        periodo: '2020-1',
      }),
    });
    expect(tx.programa.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { fechaResolucion: new Date('2020-03-01T00:00:00Z') },
    });
  });

  it('si falla la BD elimina el archivo subido; si falla Storage responde 502', async () => {
    tx.resolucionMen.create.mockRejectedValueOnce(new Error('fallo BD'));
    await expect(servicio.cargarParaPrograma('p1', dto, archivo(), usuario)).rejects.toThrow('fallo BD');
    expect(almacenamiento.eliminarArchivo).toHaveBeenCalledWith(
      'documentos/resoluciones-men/u/Resolucion-12345.pdf',
      'documentos',
    );

    almacenamiento.subirArchivo.mockRejectedValueOnce(new Error('NoSuchBucket'));
    await expect(servicio.cargarParaPrograma('p1', dto, archivo(), usuario)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
