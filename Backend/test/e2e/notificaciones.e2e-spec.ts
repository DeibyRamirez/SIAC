import { TipoTramiteSIAC } from '@prisma/client';
import request from 'supertest';
import {
  USUARIOS_SEMILLA,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { asignarPrograma, crearPrograma } from '../utilidades/datos-e2e';
import { MIME_DOCX, crearDocxE2E } from '../utilidades/docx-e2e';
import type { ContextoE2E } from '../utilidades/app-e2e';
import { diaCalendarioLocal } from '../../src/vigencias/vigencias.service';

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

/** Mañana en la zona del servidor (no en UTC), igual que el cron de vigencias. */
function fechaIsoManana(): string {
  return diaCalendarioLocal(1);
}

/**
 * Alertas in-app en los cuatro eventos documentados en ADR-006/008.
 * Correo nulo en E2E (sin llamadas externas a Resend/SMTP).
 */
describe('Notificaciones in-app (AlertaInApp)', () => {
  let ctx: ContextoE2E;
  let tokenCargador: string;
  let tokenRevisor: string;
  let tokenAdmin: string;
  let cargadorId: string;
  let revisorId: string;
  let adminId: string;
  let programaId: string;
  let evidenciaId: string;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);

    const cargador = await iniciarSesion(ctx.app, 'Cargador');
    const revisor = await iniciarSesion(ctx.app, 'Revisor');
    tokenCargador = cargador.token;
    tokenRevisor = revisor.token;
    cargadorId = cargador.usuarioId;
    revisorId = revisor.usuarioId;

    const admin = await iniciarSesion(ctx.app, 'Administrador');
    tokenAdmin = admin.token;
    adminId = admin.usuarioId;

    programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Notificaciones E2E',
        slug: 'notif-e2e',
        tipoTramiteActivo: TipoTramiteSIAC.RegistroCalificadoNuevo,
      })
    ).id;
    await asignarPrograma(ctx.prisma, cargadorId, programaId);
    await asignarPrograma(ctx.prisma, revisorId, programaId);
  });

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  async function listarTipos(token: string): Promise<string[]> {
    const { body } = await request(servidor())
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (body as { tipo: string }[]).map((a) => a.tipo);
  }

  it('revision_pendiente: al enviar a revisión notifica a los revisores del programa', async () => {
    const docx = await crearDocxE2E('Evidencia notif');
    const { body: creada } = await request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', 'Evidencia notif')
      .field('programaId', programaId)
      .field('periodo', '2026-2')
      .field('codigoGuia', 'G1')
      .attach('archivo', docx, { filename: 'evidencia.docx', contentType: MIME_DOCX })
      .expect(201);
    evidenciaId = creada.id;

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(201);

    const tiposRevisor = await listarTipos(tokenRevisor);
    expect(tiposRevisor).toContain('revision_pendiente');

    const enBd = await ctx.prisma.alertaInApp.findFirst({
      where: { usuarioId: revisorId, tipo: 'revision_pendiente' },
    });
    expect(enBd?.mensaje).toMatch(/Nueva evidencia en revisión/i);
  });

  it('observaciones y avance: el dictamen notifica al cargador y umbrales a Admin/Par', async () => {
    const condiciones = CONDICIONES_G1.map((codigo, i) => ({
      codigo,
      cumple: i < 5,
      ...(i < 5 ? {} : { observacion: `Falta ${codigo}` }),
    }));

    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaId}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ condiciones, observaciones: 'Completar condiciones 6 a 9.' })
      .expect(201);

    const tiposCargador = await listarTipos(tokenCargador);
    expect(tiposCargador).toContain('dictamen_con_observaciones');

    const tiposAdmin = await listarTipos(tokenAdmin);
    expect(tiposAdmin).toContain('avance');

    const avanceBd = await ctx.prisma.alertaInApp.findFirst({
      where: { tipo: 'avance', usuarioId: adminId },
      orderBy: { createdAt: 'desc' },
    });
    expect(avanceBd?.metadata).toMatchObject({ programaId, umbral: 'amarillo' });
  });

  it('anexo D-1: el cron crea alerta para el Administrador y no duplica al reejecutar', async () => {
    await request(servidor())
      .post('/api/v1/vigencias/con-archivo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('titulo', 'Certificado prueba notificación')
      .field('programaId', programaId)
      .field('categoria', 'Infraestructura')
      .field('evidenciaId', evidenciaId)
      .field('fechaVencimiento', fechaIsoManana())
      .field('responsable', USUARIOS_SEMILLA.Administrador.correo)
      .attach('archivo', Buffer.from('%PDF-1.4 test'), {
        filename: 'cert.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    await request(servidor())
      .post('/api/v1/vigencias/ejecutar-cron')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(201);

    const tiposAdmin = await listarTipos(tokenAdmin);
    expect(tiposAdmin).toContain('anexo_vence_manana');

    const vigenciaBd = await ctx.prisma.alertaInApp.findFirst({
      where: { usuarioId: adminId, tipo: 'anexo_vence_manana' },
      orderBy: { createdAt: 'desc' },
    });
    expect(vigenciaBd?.mensaje).toMatch(/vence mañana/i);

    // CA2: reejecutar el cron el mismo día no duplica alertas ni filas de outbox (clave única).
    const alertasAntes = await ctx.prisma.alertaInApp.count({
      where: { tipo: 'anexo_vence_manana' },
    });
    const salidaAntes = await ctx.prisma.notificacionSalida.count({
      where: { tipo: 'anexo_vence_manana' },
    });
    await request(servidor())
      .post('/api/v1/vigencias/ejecutar-cron')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(201);
    expect(await ctx.prisma.alertaInApp.count({ where: { tipo: 'anexo_vence_manana' } })).toBe(
      alertasAntes,
    );
    expect(
      await ctx.prisma.notificacionSalida.count({ where: { tipo: 'anexo_vence_manana' } }),
    ).toBe(salidaAntes);
  });

  it('vigencia registro: resolución vencida notifica vigencia_vencida al administrador', async () => {
    await ctx.prisma.programa.update({
      where: { id: programaId },
      data: { fechaResolucion: new Date('2015-01-01T00:00:00.000Z') },
    });

    await request(servidor())
      .post('/api/v1/vigencias/ejecutar-cron')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(201);

    const alerta = await ctx.prisma.alertaInApp.findFirst({
      where: { usuarioId: adminId, tipo: 'vigencia_vencida' },
      orderBy: { createdAt: 'desc' },
    });
    expect(alerta?.mensaje).toMatch(/superado los 7 años/i);
  });
});
