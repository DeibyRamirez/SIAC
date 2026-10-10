import { Logger } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, EstadoVigencia } from '@prisma/client';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { crearEvidencia, crearPrograma } from '../utilidades/datos-e2e';

/**
 * R-D y decisión del PO (06/10): carga de anexos con documento y evidencia obligatorios, categoría
 * explícita para RN-003, vencimiento desde el certificado, errores de Storage y estado al consultar.
 */
describe('Anexos de vigencia (AnexoVigencia)', () => {
  let ctx: ContextoE2E;
  let token: string;
  let programaId: string;
  let evidenciaId: string;
  let evidenciaOtroPrograma: string;
  const PDF = Buffer.from('%PDF-1.4 certificado de prueba');

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);
    const admin = await iniciarSesion(ctx.app, 'Administrador');
    token = admin.token;
    programaId = (await crearPrograma(ctx.prisma, { nombre: 'Derecho', slug: 'derecho' })).id;
    const otroPrograma = (await crearPrograma(ctx.prisma, { nombre: 'Medicina', slug: 'medicina' })).id;
    const datosEvidencia = { autorId: admin.usuarioId, codigoGuia: CodigoDocumentoGuia.G1, estado: EstadoEvidencia.Cumple, puntaje: 9, total: 9 };
    evidenciaId = (await crearEvidencia(ctx.prisma, { ...datosEvidencia, nombre: 'G1 Derecho', programaId })).id;
    evidenciaOtroPrograma = (
      await crearEvidencia(ctx.prisma, { ...datosEvidencia, nombre: 'G1 Medicina', programaId: otroPrograma })
    ).id;
  });

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  beforeEach(() => ctx.almacen.limpiar());

  function cargar(
    nombre: string,
    tipoContenido = 'application/pdf',
    campos: Record<string, string> = {},
  ) {
    const valores: Record<string, string> = {
      titulo: 'Certificado de bomberos',
      programaId,
      categoria: 'Infraestructura',
      evidenciaId,
      fechaVencimiento: '2030-09-01',
      carpeta: 'Infraestructura Física',
      responsable: 'admin.planeacion@uniautonoma.edu.co',
      ...campos,
    };
    let peticion = request(ctx.app.getHttpServer())
      .post('/api/v1/vigencias/con-archivo')
      .set('Authorization', `Bearer ${token}`);
    for (const [campo, valor] of Object.entries(valores)) {
      if (valor !== '') peticion = peticion.field(campo, valor);
    }
    return peticion.attach('archivo', PDF, { filename: nombre, contentType: tipoContenido });
  }

  it('un nombre con tildes y raya se guarda con clave ASCII y conserva el nombre legible', async () => {
    const { body } = await cargar('Certificado de bomberos — Sede Norte.pdf').expect(201);

    const anio = new Date().getFullYear();
    expect(body.rutaArchivo).toMatch(
      new RegExp(
        `^documentos/${anio}/[^/]+/infraestructura-fisica/[0-9a-f-]{36}/Certificado-de-bomberos-Sede-Norte\\.pdf$`,
      ),
    );
    expect(body.nombreArchivo).toBe('Certificado de bomberos — Sede Norte.pdf');
    expect(ctx.almacen.archivos.get(body.rutaArchivo)?.buffer.equals(PDF)).toBe(true);
  });

  it('un formato no permitido responde 400 (no 404) con mensaje claro', async () => {
    const { body } = await cargar('certificado.bin', 'application/octet-stream').expect(400);
    expect(JSON.stringify(body)).toMatch(/Formato de archivo no permitido/);
  });

  it('si falta el bucket: 503 con mensaje, sin fila huérfana y con registro en el log', async () => {
    const espiaLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const antes = await ctx.prisma.anexoVigencia.count();
    ctx.almacen.errorSiguienteSubida = Object.assign(new Error('The specified bucket does not exist'), {
      name: 'NoSuchBucket',
    });

    const { body } = await cargar('certificado.pdf').expect(503);

    expect(JSON.stringify(body)).toMatch(/bucket de documentos no existe/);
    expect(await ctx.prisma.anexoVigencia.count()).toBe(antes);
    expect(espiaLog.mock.calls.some(([mensaje]) => String(mensaje).includes('NoSuchBucket'))).toBe(true);
    espiaLog.mockRestore();
  });

  it('cualquier otro fallo de Storage responde 502 y tampoco deja fila', async () => {
    const espiaLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const antes = await ctx.prisma.anexoVigencia.count();
    ctx.almacen.errorSiguienteSubida = new Error('Tiempo de espera agotado');

    const { body } = await cargar('certificado.pdf').expect(502);

    expect(JSON.stringify(body)).toMatch(/Tiempo de espera agotado/);
    expect(await ctx.prisma.anexoVigencia.count()).toBe(antes);
    espiaLog.mockRestore();
  });

  it('el estado se calcula al consultar aunque la columna diga Vigente; Infraestructura vencida → Rojo (RN-003)', async () => {
    const { body: creado } = await cargar('uso-de-suelo.pdf', 'application/pdf', {
      titulo: 'Concepto de uso de suelo',
      fechaVencimiento: '2026-09-01',
    }).expect(201);
    expect(creado.categoria).toBe('Infraestructura');
    expect(creado.evidenciaId).toBe(evidenciaId);
    await ctx.prisma.anexoVigencia.update({ where: { id: creado.id }, data: { estado: EstadoVigencia.Vigente } });

    const { body } = await request(ctx.app.getHttpServer())
      .get(`/api/v1/vigencias?programaId=${programaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(body.find((a: { id: string }) => a.id === creado.id).estado).toBe('Vencido');

    const panel = await request(ctx.app.getHttpServer())
      .get('/api/v1/programas/panel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const fila = panel.body.datos.find((f: { id: string }) => f.id === programaId);
    expect(fila.anexoInfraestructuraVencido).toBe(true);
    expect(fila.semaforoGeneral).toBe('Rojo');
  });

  it('un permiso vencido no activa RN-003 aunque su texto diga «infraestructura»', async () => {
    const programaPermiso = (await crearPrograma(ctx.prisma, { nombre: 'Psicología', slug: 'psicologia' })).id;
    const evidenciaPermiso = (
      await crearEvidencia(ctx.prisma, {
        nombre: 'G1 Psicología',
        autorId: (await ctx.prisma.evidencia.findUniqueOrThrow({ where: { id: evidenciaId } })).autorId,
        programaId: programaPermiso,
        codigoGuia: CodigoDocumentoGuia.G1,
        estado: EstadoEvidencia.Cumple,
        puntaje: 9,
        total: 9,
      })
    ).id;
    await cargar('permiso.pdf', 'application/pdf', {
      programaId: programaPermiso,
      evidenciaId: evidenciaPermiso,
      categoria: 'Permiso',
      tipo: 'Permiso de infraestructura deportiva',
      fechaVencimiento: '2026-09-01',
    }).expect(201);

    const panel = await request(ctx.app.getHttpServer())
      .get('/api/v1/programas/panel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const fila = panel.body.datos.find((f: { id: string }) => f.id === programaPermiso);
    expect(fila.anexoInfraestructuraVencido).toBe(false);
  });

  it('el vencimiento sale del certificado: expedición + años cuando no hay fecha de vencimiento', async () => {
    const { body } = await cargar('convenio.pdf', 'application/pdf', {
      categoria: 'Convenio',
      fechaVencimiento: '',
      fechaExpedicion: '2021-03-15',
      aniosVigencia: '5',
    }).expect(201);
    expect(body.fechaVencimiento.slice(0, 10)).toBe('2026-03-15');
    expect(body.fechaExpedicion.slice(0, 10)).toBe('2021-03-15');

    const sinFechas = await cargar('convenio.pdf', 'application/pdf', { fechaVencimiento: '' }).expect(400);
    expect(JSON.stringify(sinFechas.body)).toMatch(/fecha de vencimiento del certificado/);
  });

  it('exige evidencia del mismo programa y categoría válida (400)', async () => {
    await cargar('a.pdf', 'application/pdf', { evidenciaId: '' }).expect(400);
    const otro = await cargar('a.pdf', 'application/pdf', { evidenciaId: evidenciaOtroPrograma }).expect(400);
    expect(JSON.stringify(otro.body)).toMatch(/no pertenece al programa/);
    await cargar('a.pdf', 'application/pdf', { categoria: 'Bomberos' }).expect(400);
  });

  it('el alta sin archivo ya no existe y la BD rechaza anexos nuevos sin documento ni evidencia', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/vigencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Sin archivo', programaId, tipo: 'Infraestructura', fechaVencimiento: '2030-01-01', responsable: 'x' })
      .expect(404);

    await expect(
      ctx.prisma.anexoVigencia.create({
        data: { titulo: 'Sin documento', programaId, tipo: 'Otro', fechaVencimiento: new Date('2030-01-01'), responsable: 'x' },
      }),
    ).rejects.toThrow(/AnexoVigencia_documento_y_evidencia_chk/);

    const [{ sin_documento }] = await ctx.prisma.$queryRaw<{ sin_documento: bigint }[]>`
      SELECT count(*) AS sin_documento FROM "AnexoVigencia" WHERE "rutaArchivo" IS NULL OR "rutaArchivo" = ''`;
    expect(Number(sin_documento)).toBe(0);
  });
});
