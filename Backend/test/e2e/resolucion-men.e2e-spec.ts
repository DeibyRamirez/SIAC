import { CodigoDocumentoGuia, EstadoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { crearEvidencia, crearPrograma } from '../utilidades/datos-e2e';

/**
 * Resolución MEN e inicio de vigencia (decisión del PO, 06/10; reemplaza «activar vigencia»).
 * Fecha de referencia del criterio: 06/10/2026 (2020-03-01 → fin 2027-03-01 → Amarillo).
 */
describe('Resolución MEN (POST /programas/:id/resolucion y /institucion/resolucion)', () => {
  let ctx: ContextoE2E;
  let tokenAdmin: string;
  let tokenCargador: string;
  let adminId: string;
  let programaId: string;
  const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);

  beforeAll(async () => {
    jest.useFakeTimers({ now: new Date('2026-10-06T15:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'performance', 'hrtime'] });
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);
    const admin = await iniciarSesion(ctx.app, 'Administrador');
    tokenAdmin = admin.token;
    adminId = admin.usuarioId;
    tokenCargador = (await iniciarSesion(ctx.app, 'Cargador')).token;
    programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Derecho',
        slug: 'derecho',
        tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
      })
    ).id;
    await crearEvidencia(ctx.prisma, {
      nombre: 'G1 Derecho',
      autorId: adminId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Cumple,
      puntaje: 9,
      total: 9,
    });
  });

  afterAll(async () => {
    jest.useRealTimers();
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function cargar(
    ruta: string,
    archivo: { buffer: Buffer; nombre: string; tipo: string },
    campos: { numero?: string; fechaResolucion?: string } = {},
    token = tokenAdmin,
  ) {
    return request(ctx.app.getHttpServer())
      .post(`/api/v1${ruta}`)
      .set('Authorization', `Bearer ${token}`)
      .field('numero', campos.numero ?? '012345')
      .field('fechaResolucion', campos.fechaResolucion ?? '2020-03-01')
      .attach('archivo', archivo.buffer, { filename: archivo.nombre, contentType: archivo.tipo });
  }

  const pdfValido = { buffer: PDF, nombre: 'Resolución 012345.pdf', tipo: 'application/pdf' };

  it('con documentos pendientes (G2 sin aprobar) responde 409 y el progreso deshabilita la carga', async () => {
    const { body: progreso } = await request(ctx.app.getHttpServer())
      .get(`/api/v1/programas/${programaId}/progreso`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(progreso.puedeCargarResolucion).toBe(false);
    expect(progreso.documentosPendientes).toEqual(['G2']);

    const { body } = await cargar(`/programas/${programaId}/resolucion`, pdfValido).expect(409);
    expect(JSON.stringify(body)).toMatch(/faltan documentos aprobados.*G2/);
    expect(await ctx.prisma.resolucionMen.count()).toBe(0);
    expect(ctx.almacen.archivos.size).toBe(0);
  });

  it('la institución sin G3 aprobado también responde 409', async () => {
    await cargar('/institucion/resolucion', pdfValido).expect(409);
  });

  it('solo el Administrador puede cargarla (Cargador → 403)', async () => {
    await cargar(`/programas/${programaId}/resolucion`, pdfValido, {}, tokenCargador).expect(403);
  });

  describe('con todos los documentos aprobados', () => {
    beforeAll(async () => {
      await crearEvidencia(ctx.prisma, {
        nombre: 'G2 Derecho',
        autorId: adminId,
        programaId,
        codigoGuia: CodigoDocumentoGuia.G2,
        estado: EstadoEvidencia.Validado,
      });
    });

    it('rechaza un PDF falso (firma .docx) y un .docx en esta ruta con 400', async () => {
      const falso = await cargar(`/programas/${programaId}/resolucion`, {
        buffer: DOCX,
        nombre: 'resolucion.pdf',
        tipo: 'application/pdf',
      }).expect(400);
      expect(JSON.stringify(falso.body)).toMatch(/no es un PDF válido/);

      const docx = await cargar(`/programas/${programaId}/resolucion`, {
        buffer: DOCX,
        nombre: 'resolucion.docx',
        tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }).expect(400);
      expect(JSON.stringify(docx.body)).toMatch(/\.pdf/);
      expect(await ctx.prisma.resolucionMen.count()).toBe(0);
    });

    it('rechaza una fecha futura con 400', async () => {
      await cargar(`/programas/${programaId}/resolucion`, pdfValido, { fechaResolucion: '2026-12-01' }).expect(400);
    });

    it('fecha 2020-03-01 → fin 2027-03-01 y semáforo Amarillo el 06/10/2026 (respuesta y panel)', async () => {
      const { body } = await cargar(`/programas/${programaId}/resolucion`, pdfValido).expect(201);
      expect(body.numero).toBe('012345');
      expect(body.fechaFinVigencia.slice(0, 10)).toBe('2027-03-01');
      expect(body.semaforoVigencia).toBe('Amarillo');

      const evidencia = await ctx.prisma.evidencia.findUniqueOrThrow({ where: { id: body.evidenciaId } });
      expect(evidencia.tipoEvidencia).toBe('ResolucionMen');
      expect(evidencia.mimeType).toBe('application/pdf');
      expect(ctx.almacen.archivos.get(evidencia.rutaArchivo!)?.buffer.equals(PDF)).toBe(true);

      const { body: panel } = await request(ctx.app.getHttpServer())
        .get('/api/v1/programas/panel')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const fila = panel.datos.find((p: { id: string }) => p.id === programaId);
      expect(fila.fechaResolucion.slice(0, 10)).toBe('2020-03-01');
      expect(fila.fechaFinVigencia.slice(0, 10)).toBe('2027-03-01');
      expect(fila.semaforoVigencia).toBe('Amarillo');
    });

    it('la ruta antigua «activar-vigencia» ya no existe', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/programas/${programaId}/activar-vigencia`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404);
    });
  });
});
