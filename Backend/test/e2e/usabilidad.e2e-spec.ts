import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio } from '../utilidades/app-e2e';
import { asignarPrograma, crearEvidencia, crearPrograma, crearUsuarioE2E } from '../utilidades/datos-e2e';
import { MIME_DOCX, crearDocxE2E } from '../utilidades/docx-e2e';

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
      nombre: 'Documento validado',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Validado,
    });
    evidenciaId = evidencia.id;
    await ctx.prisma.evidenciaVersion.create({
      data: { evidenciaId, numero: 1, nombreArchivo: 'Documento validado.docx', rutaArchivo: 'e2e/v1.docx', subidoPorId: cargadorId },
    });
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.prisma.usuario.deleteMany({ where: { id: revisorAjenoId } });
    await ctx.app.close();
  });

  const subir = async (token: string, nombre: string, esperado: number) => {
    const docx = await crearDocxE2E(nombre);
    return request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/reemplazo-documento`)
      .set('Authorization', `Bearer ${token}`)
      .attach('archivo', docx, { filename: `${nombre}.docx`, contentType: MIME_DOCX })
      .expect(esperado);
  };

  it('Cargador no puede usar el reemplazo de gestión (403)', async () => {
    await subir(tokenCargador, 'cargador', 403);
  });

  it('Revisor sin el programa asignado recibe 403', async () => {
    await subir(tokenRevisorAjeno, 'ajeno', 403);
  });

  it('Revisor asignado reemplaza el documento Validado: versión 2, estado conservado, auditoría', async () => {
    const { body } = await subir(tokenRevisor, 'revisor', 201);
    expect(body.version).toBe(2);
    expect(body.estado).toBe(EstadoEvidencia.Validado);
    const versiones = await ctx.prisma.evidenciaVersion.findMany({ where: { evidenciaId }, orderBy: { numero: 'asc' } });
    expect(versiones.map((v) => [v.numero, v.subidoPorId])).toEqual([
      [1, cargadorId],
      [2, revisorId],
    ]);
    const historial = await ctx.prisma.historialEvidencia.findFirst({ where: { evidenciaId, actorId: revisorId } });
    expect(historial?.observacion).toContain('Documento reemplazado por Revisor (versión 2');
    expect(historial?.createdAt).toBeInstanceOf(Date);
  });

  it('Administrador (sin asignación) también reemplaza: versión 3', async () => {
    const { body } = await subir(tokenAdmin, 'admin', 201);
    expect(body.version).toBe(3);
    const v3 = await ctx.prisma.evidenciaVersion.findFirstOrThrow({ where: { evidenciaId, numero: 3 } });
    expect(v3.subidoPorId).toBe(adminId);
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
});
