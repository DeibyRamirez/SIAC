import request from 'supertest';
import { RolUsuario } from '@prisma/client';
import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio } from '../utilidades/app-e2e';
import { asignarPrograma, crearPrograma, crearUsuarioE2E } from '../utilidades/datos-e2e';
import { CorreoMemoriaProveedor } from '../utilidades/correo-memoria';
import { EvaluadorVigenciaRegistroService } from '../../src/vigencias/evaluador-vigencia-registro.service';
import { VigenciaDemoService } from '../../src/vigencias/vigencia-demo.service';
import { ProcesadorNotificacionesSalidaService } from '../../src/notificaciones/procesador-notificaciones-salida.service';

// Demo acelerada de 300 s con tick de 10 s; el correo del SuperAdmin entra en la lista permitida.
process.env.VIGENCIA_DURACION_PRUEBA_SEG = '300';
process.env.VIGENCIA_INTERVALO_PRUEBA_SEG = '10';
process.env.CORREO_DESTINATARIOS_PERMITIDOS = [
  process.env.CORREO_DESTINATARIOS_PERMITIDOS,
  'superadmin@uniautonoma.edu.co',
]
  .filter(Boolean)
  .join(',');

/**
 * «Iniciar prueba de vigencia (5 min)» de punta a punta, sin esperar 5 minutos: se adelanta la
 * marca de inicio de la sesión demo y se evalúa como lo haría el tick.
 * - Un tick tardío que llega ya en Vencido recupera Amarillo y Rojo (fix A): 3 avisos por
 *   destinatario, sin duplicados al repetir.
 * - Destinatarios: Administrador, SuperAdmin y Revisor del programa; nunca el Cargador (PO 27/10).
 * - Correos con [PRUEBA], programa en el asunto y enlace por rol (fixes G, H, J).
 * - demo/estado expone la duración (fuente única) y refleja la sesión terminada (fix D).
 */
describe('Demo acelerada de vigencia (modo prueba)', () => {
  let ctx: ContextoE2E;
  let transporte: CorreoMemoriaProveedor;
  let tokenAdmin: string;
  let programaId: string;
  let revisorId: string;
  let cargadorId: string;
  let resolucionInstitucionOriginal: Date | null = null;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    transporte = new CorreoMemoriaProveedor();
    ctx = await crearAppE2E({ correoMemoria: transporte, modoPruebaVigencia: true });
    await limpiarDatosNegocio(ctx.prisma);
    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;
    revisorId = (await iniciarSesion(ctx.app, 'Revisor')).usuarioId;
    await ctx.prisma.configuracionSIAC.update({
      where: { id: 'global' },
      data: { mesesAvisoVigencia: 12, mesesRojoVigencia: 6 },
    });
    const institucion = await ctx.prisma.institucion.findFirstOrThrow();
    resolucionInstitucionOriginal = institucion.fechaResolucion;
    await ctx.prisma.institucion.update({ where: { id: institucion.id }, data: { fechaResolucion: null } });

    programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Demo vigencia E2E',
        slug: 'demo-vigencia-e2e',
        fechaResolucion: new Date('2025-01-15T00:00:00.000Z'),
      })
    ).id;
    await asignarPrograma(ctx.prisma, revisorId, programaId);
    const cargador = await crearUsuarioE2E(ctx.prisma, {
      alias: 'cargador-demo-vigencia',
      rol: RolUsuario.Cargador,
      contrasena: 'no-se-usa-en-esta-prueba',
    });
    cargadorId = cargador.id;
    await asignarPrograma(ctx.prisma, cargadorId, programaId);
  });

  afterAll(async () => {
    if (!ctx) return;
    const institucion = await ctx.prisma.institucion.findFirst();
    if (institucion) {
      await ctx.prisma.institucion.update({
        where: { id: institucion.id },
        data: { fechaResolucion: resolucionInstitucionOriginal },
      });
    }
    await ctx.prisma.usuarioPrograma.deleteMany({ where: { usuarioId: cargadorId } });
    await ctx.prisma.usuario.deleteMany({ where: { id: cargadorId } });
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  it('iniciar devuelve la duración y el intervalo; demo/estado los repite como fuente única', async () => {
    const { body } = await request(servidor())
      .post('/api/v1/vigencias/demo/iniciar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ entidadId: programaId, alcance: 'Programa' })
      .expect(201);
    expect(body).toMatchObject({ duracionSeg: 300, intervaloSeg: 10 });
    expect(typeof body.inicioAtMs).toBe('number');

    const estado = await request(servidor())
      .get(`/api/v1/vigencias/demo/estado?entidadId=${programaId}&alcance=Programa`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(estado.body).toMatchObject({ modoPrueba: true, activa: true, inicioAtMs: body.inicioAtMs, duracionSeg: 300 });
  });

  it('programa inexistente responde 404 (fix E)', async () => {
    await request(servidor())
      .post('/api/v1/vigencias/demo/iniciar')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ entidadId: 'no-existe', alcance: 'Programa' })
      .expect(404);
  });

  it('tick tardío en Vencido: 3 avisos por destinatario, sin Cargador y sin duplicados', async () => {
    const sesion = ctx.app.get(VigenciaDemoService).obtenerSesion('Programa', programaId);
    expect(sesion).not.toBeNull();
    // Simula que el primer tick llega a los 305 s (se perdieron Amarillo y Rojo).
    sesion!.inicioAtMs = Date.now() - 305_000;
    const evaluador = ctx.app.get(EvaluadorVigenciaRegistroService);
    await evaluador.evaluarTodasLasEntidades(new Date(), { soloSesionesDemo: true });
    await evaluador.evaluarTodasLasEntidades(new Date(), { soloSesionesDemo: true });

    const alertas = await ctx.prisma.alertaInApp.findMany({
      where: { claveEvento: { startsWith: `vigencia:${programaId}:demo-` } },
      select: { usuarioId: true, tipo: true },
    });
    expect(alertas).toHaveLength(9);
    expect(alertas.some((a) => a.usuarioId === cargadorId)).toBe(false);
    const porUsuario = new Map<string, string[]>();
    for (const a of alertas) porUsuario.set(a.usuarioId, [...(porUsuario.get(a.usuarioId) ?? []), a.tipo]);
    expect(porUsuario.size).toBe(3);
    expect(porUsuario.has(revisorId)).toBe(true);
    for (const tipos of porUsuario.values()) {
      expect(tipos.sort()).toEqual(['vigencia_amarilla', 'vigencia_roja', 'vigencia_vencida']);
    }
    expect(
      await ctx.prisma.notificacionSalida.count({ where: { claveEvento: { startsWith: `vigencia:${programaId}:demo-` } } }),
    ).toBe(9);
  });

  it('el outbox envía 9 correos con [PRUEBA], el programa en el asunto y enlace por rol', async () => {
    await ctx.app.get(ProcesadorNotificacionesSalidaService).procesarPendientes(new Date());
    const demo = transporte.mensajes.filter((m) => m.asunto.includes('Demo vigencia E2E'));
    expect(demo).toHaveLength(9);
    expect(demo.every((m) => m.asunto.startsWith('[PRUEBA] [SIAC] Demo vigencia E2E:'))).toBe(true);
    const revisor = await ctx.prisma.usuario.findUniqueOrThrow({ where: { id: revisorId } });
    const alRevisor = demo.filter((m) => m.destinatario === revisor.correo);
    expect(alRevisor).toHaveLength(3);
    expect(alRevisor.every((m) => /\/revisor(\s|$)/.test(m.textoPlano))).toBe(true);
    expect(alRevisor.some((m) => m.textoPlano.includes('/administrador/'))).toBe(false);
  });

  it('al detener, demo/estado informa la sesión terminada (fix D)', async () => {
    await request(servidor())
      .post('/api/v1/vigencias/demo/detener')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ entidadId: programaId, alcance: 'Programa' })
      .expect(201);
    const { body } = await request(servidor())
      .get(`/api/v1/vigencias/demo/estado?entidadId=${programaId}&alcance=Programa`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(body).toMatchObject({ activa: false, inicioAtMs: null });
  });
});
