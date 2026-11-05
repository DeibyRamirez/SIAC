import request from 'supertest';
import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
  USUARIOS_SEMILLA,
} from '../utilidades/app-e2e';
import { asignarPrograma, crearEvidencia, crearPrograma, crearUsuarioE2E } from '../utilidades/datos-e2e';
import { diaCalendarioLocal } from '../../src/vigencias/vigencias.service';

/**
 * Aviso D-1 de anexos (pendientes 20/10, ítem 2): con un anexo que vence mañana, el cron crea
 * 1 alerta in-app y 1 fila de outbox por cada Administrador, SuperAdmin y Revisor del programa.
 * El responsable (Cargador) y un Revisor de otro programa no reciben nada (PO 27/10). Reejecutar no duplica.
 * Corre con la API conectada como siac_app: el despacho usa la ruta de sistema de la RLS.
 */
describe('Anexo D-1: el aviso llega al Revisor del programa (HU-007)', () => {
  let ctx: ContextoE2E;
  let tokenAdmin: string;
  const ids: Record<string, string> = {};

  const alertasD1 = (usuarioId: string) =>
    ctx.prisma.alertaInApp.count({ where: { usuarioId, tipo: 'anexo_vence_manana' } });
  const salidasD1 = (usuarioId: string) =>
    ctx.prisma.notificacionSalida.count({ where: { usuarioId, tipo: 'anexo_vence_manana' } });

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);
    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;

    const p = ctx.prisma;
    const programa = await crearPrograma(p, { nombre: 'D-1 Revisor', slug: 'd1-revisor' });
    const otro = await crearPrograma(p, { nombre: 'D-1 Otro', slug: 'd1-otro' });
    const revisor = await p.usuario.findUniqueOrThrow({ where: { correo: USUARIOS_SEMILLA.Revisor.correo } });
    const cargador = await p.usuario.findUniqueOrThrow({ where: { correo: USUARIOS_SEMILLA.Cargador.correo } });
    ids.revisor = revisor.id;
    ids.cargador = cargador.id;
    ids.admin = (await p.usuario.findUniqueOrThrow({ where: { correo: USUARIOS_SEMILLA.Administrador.correo } })).id;
    ids.super = (
      await crearUsuarioE2E(p, { alias: 'd1-super', rol: RolUsuario.SuperAdmin, contrasena: 'NoSeUsa-D1-1' })
    ).id;
    ids.revisorOtro = (
      await crearUsuarioE2E(p, { alias: 'd1-rev-otro', rol: RolUsuario.Revisor, contrasena: 'NoSeUsa-D1-2' })
    ).id;
    await asignarPrograma(p, revisor.id, programa.id);
    await asignarPrograma(p, ids.revisorOtro, otro.id);

    const evidencia = await crearEvidencia(p, {
      nombre: 'Certificado D-1',
      autorId: cargador.id,
      programaId: programa.id,
      codigoGuia: CodigoDocumentoGuia.G2,
      estado: EstadoEvidencia.Validado,
    });
    await p.anexoVigencia.create({
      data: {
        titulo: 'Póliza que vence mañana',
        programaId: programa.id,
        tipo: 'Póliza',
        fechaVencimiento: new Date(`${diaCalendarioLocal(1)}T00:00:00.000Z`),
        responsable: USUARIOS_SEMILLA.Cargador.correo,
        rutaArchivo: 'anexos/poliza.pdf',
        evidenciaId: evidencia.id,
      },
    });
  });

  afterAll(async () => {
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  it('crea alerta y correo para Admin, SuperAdmin y Revisor del programa; no para el responsable ni otro Revisor', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/vigencias/ejecutar-cron')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(201);

    for (const destinatario of [ids.revisor, ids.admin, ids.super]) {
      expect(await alertasD1(destinatario)).toBe(1);
      expect(await salidasD1(destinatario)).toBe(1);
    }
    expect(await alertasD1(ids.revisorOtro)).toBe(0);
    expect(await alertasD1(ids.cargador)).toBe(0);
    expect(await salidasD1(ids.cargador)).toBe(0);

    // El Revisor ve su aviso por la API (RLS: alertas propias).
    const { token: tokenRevisor } = await iniciarSesion(ctx.app, 'Revisor');
    const { body } = await request(ctx.app.getHttpServer())
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .expect(200);
    const lista = Array.isArray(body) ? body : body.datos;
    expect(lista.some((a: { tipo: string }) => a.tipo === 'anexo_vence_manana')).toBe(true);
  });

  it('reejecutar el cron el mismo día no duplica alertas ni filas de outbox', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/vigencias/ejecutar-cron')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(201);
    expect(await alertasD1(ids.revisor)).toBe(1);
    expect(await salidasD1(ids.revisor)).toBe(1);
  });
});
