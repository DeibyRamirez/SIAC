import request from 'supertest';
import type { Response } from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio } from '../utilidades/app-e2e';
import { asignarPrograma, crearEvidencia, crearPrograma, crearUsuarioE2E } from '../utilidades/datos-e2e';
import { MIME_DOCX, crearDocxE2E } from '../utilidades/docx-e2e';

function parserBinario(
  respuesta: Response,
  callback: (error: Error | null, cuerpo: Buffer) => void,
): void {
  const fragmentos: Buffer[] = [];
  respuesta.on('data', (fragmento: Buffer) => fragmentos.push(fragmento));
  respuesta.on('end', () => callback(null, Buffer.concat(fragmentos)));
}

/**
 * Usabilidad (28/10/2026):
 * - Revisor asignado y Administrador reemplazan el documento aunque esté Validado, con RLS,
 *   versión anterior conservada e historial de quién y cuándo. Cargador y Revisor no asignado: 403.
 * - Límite de 600 caracteres en observaciones (DTO 400) y en BD (CHECK).
 */
describe('Usabilidad: reemplazo de documento validado y límite de texto', () => {
  let ctx: ContextoE2E;
  let tokenRevisor: string;
  let revisorId: string;
  let tokenAdmin: string;
  let adminId: string;
  let tokenCargador: string;
  let cargadorId: string;
  let tokenRevisorAjeno: string;
  let revisorAjenoId: string;
  let programaId: string;
  let evidenciaId: string;
  const claveAjeno = 'Revisor-Ajeno-E2E-2026!';

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);
    ({ token: tokenRevisor, usuarioId: revisorId } = await iniciarSesion(ctx.app, 'Revisor'));
    ({ token: tokenAdmin, usuarioId: adminId } = await iniciarSesion(ctx.app, 'Administrador'));
    ({ token: tokenCargador, usuarioId: cargadorId } = await iniciarSesion(ctx.app, 'Cargador'));
    programaId = (await crearPrograma(ctx.prisma, { nombre: 'Usabilidad E2E', slug: 'usabilidad-e2e' })).id;
    await asignarPrograma(ctx.prisma, revisorId, programaId);
    await asignarPrograma(ctx.prisma, cargadorId, programaId);
    const ajeno = await crearUsuarioE2E(ctx.prisma, { alias: 'revisor-ajeno-usab', rol: RolUsuario.Revisor, contrasena: claveAjeno });
    revisorAjenoId = ajeno.id;
    // Mismo JWT que emite /auth/login (los sintéticos no usan el dominio institucional).
    tokenRevisorAjeno = ctx.app.get(JwtService).sign({ sub: ajeno.id, correo: ajeno.correo, rol: ajeno.rol });

    const evidencia = await crearEvidencia(ctx.prisma, {
      nombre: 'Documento Cumple',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Cumple,
    });
    evidenciaId = evidencia.id;
    const docxInicial = await crearDocxE2E('Documento Cumple');
    ctx.almacen.archivos.set('e2e/v1.docx', {
      buffer: docxInicial,
      tipo: 'evidencias',
      mimeType: MIME_DOCX,
    });
    await ctx.prisma.evidenciaVersion.create({
      data: {
        evidenciaId,
        numero: 1,
        nombreArchivo: 'Documento Cumple.docx',
        rutaArchivo: 'e2e/v1.docx',
        subidoPorId: cargadorId,
      },
    });
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.prisma.usuario.deleteMany({ where: { id: revisorAjenoId } });
    await ctx.app.close();
  });

  const subirBuffer = (
    id: string,
    token: string,
    docx: Buffer,
    nombre: string,
    esperado: number,
  ) =>
    request(servidor())
      .post(`/api/v1/evidencias/${id}/reemplazo-documento`)
      .set('Authorization', `Bearer ${token}`)
      .attach('archivo', docx, { filename: `${nombre}.docx`, contentType: MIME_DOCX })
      .expect(esperado);

  const descargarFirmado = async (id: string, token: string, version: number) => {
    const descarga = await request(servidor())
      .get(`/api/v1/evidencias/${id}/contenido?version=${version}`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(parserBinario)
      .expect(200);
    return descarga.body as Buffer;
  };

  it('Cargador no puede usar el reemplazo de gestión (403)', async () => {
    await subirBuffer(
      evidenciaId,
      tokenCargador,
      await crearDocxE2E('cargador'),
      'cargador',
      403,
    );
  });

  it('Revisor sin el programa asignado recibe 403', async () => {
    await subirBuffer(
      evidenciaId,
      tokenRevisorAjeno,
      await crearDocxE2E('ajeno'),
      'ajeno',
      403,
    );
  });

  it('Revisor asignado reemplaza el documento Cumple: versión 2, estado conservado, auditoría', async () => {
    const firmado = await descargarFirmado(evidenciaId, tokenRevisor, 1);
    const { body } = await subirBuffer(
      evidenciaId,
      tokenRevisor,
      firmado,
      'revisor',
      201,
    );
    expect(body.version).toBe(2);
    expect(body.estado).toBe(EstadoEvidencia.Cumple);
    const versiones = await ctx.prisma.evidenciaVersion.findMany({ where: { evidenciaId }, orderBy: { numero: 'asc' } });
    expect(versiones.map((v) => [v.numero, v.subidoPorId])).toEqual([
      [1, cargadorId],
      [2, revisorId],
    ]);
    const historial = await ctx.prisma.historialEvidencia.findFirst({ where: { evidenciaId, actorId: revisorId } });
    expect(historial?.observacion).toContain('Documento reemplazado por Revisor (versión 2');
    expect(historial?.createdAt).toBeInstanceOf(Date);
  });

  it('Administrador (sin asignación) también reemplaza con su propia evidencia', async () => {
    const evidenciaAdmin = await crearEvidencia(ctx.prisma, {
      nombre: 'Documento admin Cumple',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Cumple,
    });
    const docx = await crearDocxE2E('Documento admin Cumple');
    ctx.almacen.archivos.set('e2e/admin-v1.docx', {
      buffer: docx,
      tipo: 'evidencias',
      mimeType: MIME_DOCX,
    });
    await ctx.prisma.evidenciaVersion.create({
      data: {
        evidenciaId: evidenciaAdmin.id,
        numero: 1,
        nombreArchivo: 'Documento admin Cumple.docx',
        rutaArchivo: 'e2e/admin-v1.docx',
        subidoPorId: cargadorId,
      },
    });

    const firmado = await descargarFirmado(evidenciaAdmin.id, tokenAdmin, 1);
    const { body } = await subirBuffer(
      evidenciaAdmin.id,
      tokenAdmin,
      firmado,
      'admin',
      201,
    );
    expect(body.version).toBe(2);
    const v2 = await ctx.prisma.evidenciaVersion.findFirstOrThrow({
      where: { evidenciaId: evidenciaAdmin.id, numero: 2 },
    });
    expect(v2.subidoPorId).toBe(adminId);
  });

  it('dictamen con observación de 601 caracteres responde 400', async () => {
    const enRevision = await crearEvidencia(ctx.prisma, {
      nombre: 'En revisión',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.EnRevision,
    });
    const { body } = await request(servidor())
      .post(`/api/v1/evidencias/${enRevision.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ observaciones: 'a'.repeat(601), condiciones: [] })
      .expect(400);
    expect(JSON.stringify(body)).toContain('máximo 600 caracteres');
  });

  it('la BD rechaza comentarios de más de 600 caracteres (CHECK)', async () => {
    await expect(
      ctx.prisma.evidenciaComentario.create({ data: { evidenciaId, numeroVersion: 1, texto: 'a'.repeat(601) } }),
    ).rejects.toThrow(/EvidenciaComentario_texto_max_600|check/i);
    await expect(
      ctx.prisma.evidenciaComentario.create({ data: { evidenciaId, numeroVersion: 1, texto: 'a'.repeat(600) } }),
    ).resolves.toBeTruthy();
  });

  it('GET /evidencias/periodos lista los periodos con documentos visibles (Históricos)', async () => {
    await crearEvidencia(ctx.prisma, {
      nombre: 'Histórica 2024',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Validado,
      periodo: '2024-2',
    });
    const { body } = await request(servidor())
      .get('/api/v1/evidencias/periodos')
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .expect(200);
    expect(body.periodos).toEqual(expect.arrayContaining(['2024-2', '2026-2']));
    // Revisor sin el programa: la RLS no le muestra esos periodos.
    const ajeno = await request(servidor())
      .get('/api/v1/evidencias/periodos')
      .set('Authorization', `Bearer ${tokenRevisorAjeno}`)
      .expect(200);
    expect(ajeno.body.periodos).not.toContain('2024-2');
    // El documento histórico sigue accesible filtrando por periodo.
    const filtrado = await request(servidor())
      .get('/api/v1/evidencias?periodo=2024-2')
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .expect(200);
    expect(JSON.stringify(filtrado.body)).toContain('Histórica 2024');
  });
});
