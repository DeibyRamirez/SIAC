import { JwtService } from '@nestjs/jwt';
import { EstadoEvidencia, RolUsuario } from '@prisma/client';
import request from 'supertest';
import type { Response } from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import {
  asignarPrograma,
  crearPrograma,
  crearUsuarioE2E,
} from '../utilidades/datos-e2e';
import {
  LIMITE_DOCX_BYTES,
  MIME_DOCX,
  crearDocxE2E,
  crearDocxE2EConTamanoBytes,
} from '../utilidades/docx-e2e';

const CONDICIONES_G1 = [
  'Denominacion',
  'Justificacion',
  'AspectosCurriculares',
  'OrganizacionActividades',
  'InvestigacionInnovacion',
  'RelacionSectorExterno',
  'Profesores',
  'MediosEducativos',
  'Infraestructura',
] as const;

function parserBinario(
  respuesta: Response,
  callback: (error: Error | null, cuerpo: Buffer) => void,
): void {
  const fragmentos: Buffer[] = [];
  respuesta.on('data', (fragmento: Buffer) => fragmentos.push(fragmento));
  respuesta.on('end', () => callback(null, Buffer.concat(fragmentos)));
}

/**
 * S4-UX-2: flujo preparar → validar → publicar del revisor.
 * Cada caso crea su propio programa/evidencia: no depende del orden de los tests.
 */
describe('Versiones del revisor: validar y publicar', () => {
  let ctx: ContextoE2E;
  let tokenCargador: string;
  let tokenRevisor: string;
  let tokenAdmin: string;
  let tokenRevisorAjeno: string;
  let cargadorId: string;
  let revisorId: string;
  let contador = 0;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);

    const cargador = await iniciarSesion(ctx.app, 'Cargador');
    const revisor = await iniciarSesion(ctx.app, 'Revisor');
    tokenCargador = cargador.token;
    cargadorId = cargador.usuarioId;
    tokenRevisor = revisor.token;
    revisorId = revisor.usuarioId;
    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;

    const ajeno = await crearUsuarioE2E(ctx.prisma, {
      alias: 'revisor-ajeno-version-2',
      rol: RolUsuario.Revisor,
      contrasena: 'RevisorAjenoVersion2!',
    });
    tokenRevisorAjeno = ctx.app
      .get(JwtService)
      .sign({ sub: ajeno.id, correo: ajeno.correo, rol: ajeno.rol });
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  async function crearEscenario(
    estadoFinal: 'Cumple' | 'ConObservaciones' = 'Cumple',
  ) {
    contador += 1;
    const programa = await crearPrograma(ctx.prisma, {
      nombre: `Versión revisor E2E ${contador}`,
      slug: `version-revisor-e2e-${contador}`,
    });
    await asignarPrograma(ctx.prisma, cargadorId, programa.id);
    await asignarPrograma(ctx.prisma, revisorId, programa.id);

    const creada = await request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', `G1 Documento maestro ${contador}`)
      .field('programaId', programa.id)
      .field('periodo', '2026-2')
      .field('codigoGuia', 'G1')
      .attach('archivo', await crearDocxE2E('Documento inicial'), {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(201);

    const evidenciaId = creada.body.id as string;
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(201);

    const condiciones = CONDICIONES_G1.map((codigo, indice) => ({
      codigo,
      cumple: estadoFinal === 'Cumple' ? true : indice < 5,
      ...(estadoFinal === 'Cumple' || indice < 5
        ? {}
        : { observacion: `Falta soporte de ${codigo}` }),
    }));
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ condiciones })
      .expect(201);

    return { evidenciaId, programaId: programa.id };
  }

  async function descargarFirmado(evidenciaId: string, token = tokenRevisor) {
    const descarga = await request(servidor())
      .get(`/api/v1/evidencias/${evidenciaId}/contenido`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parserBinario)
      .expect(200);
    return descarga.body as Buffer;
  }

  async function versiones(evidenciaId: string) {
    return ctx.prisma.evidenciaVersion.findMany({
      where: { evidenciaId },
      orderBy: { numero: 'asc' },
    });
  }

  it('la vista previa no firma ni crea versiones; la descarga explícita sí firma', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const alertasAntes = await ctx.prisma.alertaInApp.count({
      where: { usuarioId: cargadorId },
    });

    await request(servidor())
      .get(`/api/v1/evidencias/${evidenciaId}/contenido-preview`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .buffer(true)
      .parse(parserBinario)
      .expect(200);

    let filas = await versiones(evidenciaId);
    expect(filas).toHaveLength(1);
    expect(filas[0].firmaDescarga).toBeNull();

    const firmado = await descargarFirmado(evidenciaId);
    expect(firmado.subarray(0, 2).toString()).toBe('PK');

    filas = await versiones(evidenciaId);
    expect(filas).toHaveLength(1);
    expect(filas[0].firmaDescarga).not.toBeNull();
    const firmaTrasDescarga = filas[0].firmaDescarga;

    // Otra pestaña/usuario abre el preview después de la descarga: no debe rotar la firma.
    await request(servidor())
      .get(`/api/v1/evidencias/${evidenciaId}/contenido-preview?version=1`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .buffer(true)
      .parse(parserBinario)
      .expect(200);
    filas = await versiones(evidenciaId);
    expect(filas[0].firmaDescarga).toBe(firmaTrasDescarga);
    expect(
      await ctx.prisma.alertaInApp.count({ where: { usuarioId: cargadorId } }),
    ).toBe(alertasAntes);
  });

  it('validar un candidato no crea versión ni cambia estado; publicar crea v2 y conserva Cumple', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId);
    const alertasAntes = await ctx.prisma.alertaInApp.count({
      where: { usuarioId: cargadorId },
    });
    const correosAntes = await ctx.prisma.notificacionSalida.count({
      where: { usuarioId: cargadorId },
    });
    const firmaAntes = (await versiones(evidenciaId))[0].firmaDescarga;
    await ctx.prisma.evidenciaComentario.create({
      data: {
        evidenciaId,
        numeroVersion: 1,
        autor: 'Revisor E2E',
        texto: 'Comentario que debe conservarse.',
      },
    });

    const validacion = await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(200);

    expect(validacion.body).toMatchObject({
      versionOrigen: 1,
      nuevaVersion: 2,
    });
    expect(await versiones(evidenciaId)).toHaveLength(1);
    expect((await versiones(evidenciaId))[0].firmaDescarga).toBe(firmaAntes);

    const { body } = await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .field('versionOrigen', '1')
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(201);

    expect(body.version).toBe(2);
    expect(body.estado).toBe(EstadoEvidencia.Cumple);
    const filas = await versiones(evidenciaId);
    expect(filas).toHaveLength(2);
    expect(filas[1]).toMatchObject({
      numero: 2,
      subidoPorId: revisorId,
      subidoPorRol: RolUsuario.Revisor,
    });
    expect(
      await ctx.prisma.evidenciaComentario.count({ where: { evidenciaId } }),
    ).toBe(1);
    expect(
      await ctx.prisma.alertaInApp.count({ where: { usuarioId: cargadorId } }),
    ).toBe(alertasAntes);
    expect(
      await ctx.prisma.notificacionSalida.count({ where: { usuarioId: cargadorId } }),
    ).toBe(correosAntes);
  });

  it('otros estados rechazan validar y la ruta heredada (409), incluida una fila histórica Cumple', async () => {
    const { evidenciaId } = await crearEscenario('ConObservaciones');
    const firmado = await descargarFirmado(evidenciaId);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(409);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/reemplazo-documento`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(409);

    expect(await versiones(evidenciaId)).toHaveLength(1);

    const historica = await crearEscenario('Cumple');
    expect(
      await ctx.prisma.historialEvidencia.findFirst({
        where: {
          evidenciaId: historica.evidenciaId,
          estado: EstadoEvidencia.Cumple,
        },
      }),
    ).not.toBeNull();
    await ctx.prisma.evidencia.update({
      where: { id: historica.evidenciaId },
      data: { estado: EstadoEvidencia.ConObservaciones },
    });
    const firmadoHistorico = await descargarFirmado(historica.evidenciaId);
    await request(servidor())
      .post(`/api/v1/evidencias/${historica.evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', firmadoHistorico, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(409);
  });

  it('publicar revalida el estado aunque la validación previa haya pasado', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId);
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(200);

    await ctx.prisma.evidencia.update({
      where: { id: evidenciaId },
      data: { estado: EstadoEvidencia.ConObservaciones },
    });

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .field('versionOrigen', '1')
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(409);
    expect(await versiones(evidenciaId)).toHaveLength(1);
  });

  it('firma inválida, tipo incorrecto o exceso de tamaño no persisten cambios', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId);
    const alertasAntes = await ctx.prisma.alertaInApp.count({
      where: { usuarioId: cargadorId },
    });

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', await crearDocxE2E('Sin firma'), {
        filename: 'sin-firma.docx',
        contentType: MIME_DOCX,
      })
      .expect(400);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', Buffer.from('%PDF-1.7\n%%EOF'), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', await crearDocxE2EConTamanoBytes(LIMITE_DOCX_BYTES + 1), {
        filename: 'grande.docx',
        contentType: MIME_DOCX,
      })
      .expect(400);

    expect(await versiones(evidenciaId)).toHaveLength(1);
    const fila = (await versiones(evidenciaId))[0];
    expect(fila.firmaDescarga).not.toBeNull();
    expect(
      await ctx.prisma.alertaInApp.count({ where: { usuarioId: cargadorId } }),
    ).toBe(alertasAntes);
    // El archivo firmado sigue siendo válido después de los rechazos.
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(200);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .field('versionOrigen', '1')
      .attach('archivo', await crearDocxE2E('Sin firma al publicar'), {
        filename: 'sin-firma.docx',
        contentType: MIME_DOCX,
      })
      .expect(400);
    expect(await versiones(evidenciaId)).toHaveLength(1);
  });

  it('una descarga posterior invalida el candidato preparado con la firma anterior', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const primeraDescarga = await descargarFirmado(evidenciaId);
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .attach('archivo', primeraDescarga, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(200);

    const segundaDescarga = await descargarFirmado(evidenciaId);
    expect(segundaDescarga.equals(primeraDescarga)).toBe(false);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .field('versionOrigen', '1')
      .attach('archivo', primeraDescarga, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(400);
    expect(await versiones(evidenciaId)).toHaveLength(1);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .field('versionOrigen', '1')
      .attach('archivo', segundaDescarga, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(201);
  });

  it('dos publicaciones concurrentes crean una sola versión y la otra recibe 409', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId);

    const publicar = () =>
      request(servidor())
        .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
        .set('Authorization', `Bearer ${tokenRevisor}`)
        .field('versionOrigen', '1')
        .attach('archivo', firmado, {
          filename: 'G1 Documento maestro.docx',
          contentType: MIME_DOCX,
        });

    const [primera, segunda] = await Promise.all([publicar(), publicar()]);
    expect([primera.status, segunda.status].sort()).toEqual([201, 409]);
    const filas = await versiones(evidenciaId);
    expect(filas).toHaveLength(2);
    expect(filas[1].numero).toBe(2);
    expect(
      await ctx.prisma.evidencia.findUniqueOrThrow({ where: { id: evidenciaId } }),
    ).toMatchObject({ estado: EstadoEvidencia.Cumple, version: 2 });
  });

  it('la ruta heredada sigue disponible para Administrador con su propia evidencia', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId, tokenAdmin);

    const { body } = await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/reemplazo-documento`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(201);
    expect(body.version).toBe(2);
    expect(body.estado).toBe(EstadoEvidencia.Cumple);
  });

  it('el revisor fuera de alcance recibe 403 también en el flujo nuevo', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId);

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor/validar`)
      .set('Authorization', `Bearer ${tokenRevisorAjeno}`)
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(403);
  });

  it('GET /versiones devuelve un DTO sin firma, rutas ni texto de auditoría', async () => {
    const { evidenciaId } = await crearEscenario('Cumple');
    const firmado = await descargarFirmado(evidenciaId);
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/versiones/revisor`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .field('versionOrigen', '1')
      .attach('archivo', firmado, {
        filename: 'G1 Documento maestro.docx',
        contentType: MIME_DOCX,
      })
      .expect(201);

    const { body } = await request(servidor())
      .get(`/api/v1/evidencias/${evidenciaId}/versiones`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    for (const version of body) {
      expect(version).not.toHaveProperty('firmaDescarga');
      expect(version).not.toHaveProperty('rutaArchivo');
      expect(version).not.toHaveProperty('textoBaseAuditoria');
      expect(version).toHaveProperty('numero');
      expect(version).toHaveProperty('subidoPor');
      expect(version).toHaveProperty('subidoPorRol');
    }
  });
});
