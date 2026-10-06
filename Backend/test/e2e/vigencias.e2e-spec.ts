import { Logger } from '@nestjs/common';
import { EstadoVigencia } from '@prisma/client';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { crearPrograma } from '../utilidades/datos-e2e';

/** R-D (parte sin decisión del PO): carga de anexos, errores de Storage y estado al consultar. */
describe('Anexos de vigencia (AnexoVigencia)', () => {
  let ctx: ContextoE2E;
  let token: string;
  let programaId: string;
  const PDF = Buffer.from('%PDF-1.4 certificado de prueba');

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);
    token = (await iniciarSesion(ctx.app, 'Administrador')).token;
    programaId = (await crearPrograma(ctx.prisma, { nombre: 'Derecho', slug: 'derecho' })).id;
  });

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  beforeEach(() => ctx.almacen.limpiar());

  function cargar(nombre: string, tipoContenido = 'application/pdf') {
    return request(ctx.app.getHttpServer())
      .post('/api/v1/vigencias/con-archivo')
      .set('Authorization', `Bearer ${token}`)
      .field('titulo', 'Certificado de bomberos')
      .field('programaId', programaId)
      .field('tipo', 'Infraestructura')
      .field('carpeta', 'Infraestructura Física')
      .field('aniosVigencia', '7')
      .field('responsable', 'admin.planeacion@uniautonoma.edu.co')
      .attach('archivo', PDF, { filename: nombre, contentType: tipoContenido });
  }

  it('un nombre con tildes y raya se guarda con clave ASCII y conserva el nombre legible', async () => {
    const { body } = await cargar('Certificado de bomberos — Sede Norte.pdf').expect(201);

    expect(body.rutaArchivo).toMatch(
      /^documentos\/infraestructura-fisica\/[0-9a-f-]{36}\/Certificado-de-bomberos-Sede-Norte\.pdf$/,
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

  it('el estado se calcula al consultar aunque la columna diga Vigente (sin esperar el cron)', async () => {
    const anexo = await ctx.prisma.anexoVigencia.create({
      data: {
        titulo: 'Concepto de uso de suelo',
        programaId,
        tipo: 'Infraestructura',
        carpeta: 'general',
        fechaVencimiento: new Date('2026-09-01T12:00:00Z'),
        estado: EstadoVigencia.Vigente,
        responsable: 'admin.planeacion@uniautonoma.edu.co',
      },
    });

    const { body } = await request(ctx.app.getHttpServer())
      .get(`/api/v1/vigencias?programaId=${programaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(body.find((a: { id: string }) => a.id === anexo.id).estado).toBe('Vencido');

    const panel = await request(ctx.app.getHttpServer())
      .get('/api/v1/programas/panel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const fila = panel.body.datos.find((f: { id: string }) => f.id === programaId);
    expect(fila.anexoInfraestructuraVencido).toBe(true);
    expect(fila.semaforoGeneral).toBe('Rojo');
  });
});
