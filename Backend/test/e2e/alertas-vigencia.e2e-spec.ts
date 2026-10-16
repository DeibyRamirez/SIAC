import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio, USUARIOS_SEMILLA } from '../utilidades/app-e2e';
import { asignarPrograma, crearPrograma } from '../utilidades/datos-e2e';
import { CorreoMemoriaProveedor } from '../utilidades/correo-memoria';
import { EvaluadorVigenciaRegistroService } from '../../src/vigencias/evaluador-vigencia-registro.service';
import { ProcesadorNotificacionesSalidaService } from '../../src/notificaciones/procesador-notificaciones-salida.service';
import request from 'supertest';

// El .env local no debe alterar los E2E: sin demo de vigencia ni canal real, reintentos cortos
// y el correo del SuperAdmin permitido (la utilidad E2E suma los correos semilla, pero la
// semilla de login no incluye SuperAdmin).
process.env.VIGENCIA_MODO_PRUEBA = 'false';
process.env.CORREO_CANAL = 'ninguno';
process.env.CORREO_MAX_INTENTOS = '2';
process.env.CORREO_REINTENTO_BASE_SEGUNDOS = '1';
process.env.CORREO_DESTINATARIOS_PERMITIDOS = [
  process.env.CORREO_DESTINATARIOS_PERMITIDOS,
  'superadmin@uniautonoma.edu.co',
]
  .filter(Boolean)
  .join(',');

/**
 * CA3 de HU-007: alertas de vigencia y bitácora del outbox con reloj controlado (sin sleeps).
 * - Un programa que cruza Amarillo → Rojo → Vencido genera exactamente 1 evento por
 *   destinatario activo (Administrador, SuperAdmin, Revisor) y umbral; reejecutar el cálculo
 *   no duplica (claveEvento única).
 * - El procesador envía con un transporte en memoria (estado Enviado) y, si el transporte
 *   falla siempre, tras CORREO_MAX_INTENTOS la fila queda Fallido con ultimoError y visible
 *   en GET /notificaciones/salida.
 */
describe('Alertas de vigencia y outbox de correo (CA3)', () => {
  let ctx: ContextoE2E;
  let transporte: CorreoMemoriaProveedor;
  let tokenAdmin: string;
  let tokenRevisor: string;
  let adminId: string;
  let revisorId: string;
  let superAdminId: string;
  let programaId: string;
  let resolucionInstitucionOriginal: Date | null;

  const FECHA_RESOLUCION = new Date('2020-01-01T00:00:00.000Z');
  // Hitos con 7 años y aviso 24/rojo 18: amarillo 2025-01-01, rojo 2025-07-01, fin 2027-01-01.
  const REFERENCIA_VERDE = new Date('2024-06-01T12:00:00.000Z');
  const REFERENCIA_AMARILLA = new Date('2025-03-01T12:00:00.000Z');
  const REFERENCIA_ROJA = new Date('2025-09-01T12:00:00.000Z');
  const REFERENCIA_VENCIDA = new Date('2027-02-01T12:00:00.000Z');

  const servidor = () => ctx.app.getHttpServer();
  const evaluador = () => ctx.app.get(EvaluadorVigenciaRegistroService);
  const procesador = () => ctx.app.get(ProcesadorNotificacionesSalidaService);

  const contarAlertas = (idPrograma: string) =>
    ctx.prisma.alertaInApp.count({
      where: { metadata: { path: ['programaId'], equals: idPrograma } },
    });

  const contarSalida = (idPrograma: string) =>
    ctx.prisma.notificacionSalida.count({
      where: { claveEvento: { startsWith: `vigencia:${idPrograma}:` } },
    });

  beforeAll(async () => {
    transporte = new CorreoMemoriaProveedor();
    ctx = await crearAppE2E({ correoMemoria: transporte });
    await limpiarDatosNegocio(ctx.prisma);

    const admin = await iniciarSesion(ctx.app, 'Administrador');
    tokenAdmin = admin.token;
    adminId = admin.usuarioId;
    const revisor = await iniciarSesion(ctx.app, 'Revisor');
    tokenRevisor = revisor.token;
    revisorId = revisor.usuarioId;
    const superAdmin = await ctx.prisma.usuario.findUniqueOrThrow({
      where: { correo: 'superadmin@uniautonoma.edu.co' },
      select: { id: true },
    });
    superAdminId = superAdmin.id;

    // Determinismo del caso: umbrales 24/18 y la institución CUAC no participa de las alertas.
    await ctx.prisma.configuracionSIAC.update({
      where: { id: 'global' },
      data: { mesesAvisoVigencia: 24, mesesRojoVigencia: 18 },
    });
    const institucion = await ctx.prisma.institucion.findFirstOrThrow();
    resolucionInstitucionOriginal = institucion.fechaResolucion;
    await ctx.prisma.institucion.update({
      where: { id: institucion.id },
      data: { fechaResolucion: null },
    });

    programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Alertas vigencia E2E',
        slug: 'alertas-vigencia-e2e',
        fechaResolucion: FECHA_RESOLUCION,
      })
    ).id;
    await asignarPrograma(ctx.prisma, revisorId, programaId);
  });

  afterAll(async () => {
    if (ctx) {
      const institucion = await ctx.prisma.institucion.findFirst();
      if (institucion) {
        await ctx.prisma.institucion.update({
          where: { id: institucion.id },
          data: { fechaResolucion: resolucionInstitucionOriginal },
        });
      }
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  it('un programa que cruza amarillo, rojo y vencido genera 3 eventos por destinatario sin duplicados', async () => {
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_VERDE);
    expect(await contarAlertas(programaId)).toBe(0);

    await evaluador().evaluarTodasLasEntidades(REFERENCIA_AMARILLA);
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_ROJA);
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_VENCIDA);

    expect(await contarAlertas(programaId)).toBe(9);
    expect(await contarSalida(programaId)).toBe(9);

    for (const usuarioId of [adminId, superAdminId, revisorId]) {
      const porUsuario = await ctx.prisma.alertaInApp.findMany({
        where: { usuarioId, metadata: { path: ['programaId'], equals: programaId } },
        select: { tipo: true },
      });
      expect(porUsuario.map((a) => a.tipo).sort()).toEqual([
        'vigencia_amarilla',
        'vigencia_roja',
        'vigencia_vencida',
      ]);
    }

    // Reejecutar las cuatro referencias (el «cron dos veces») no duplica: claveEvento @unique.
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_AMARILLA);
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_ROJA);
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_VENCIDA);
    expect(await contarAlertas(programaId)).toBe(9);
    expect(await contarSalida(programaId)).toBe(9);
  });

  it('el procesador envía el outbox con el transporte en memoria y las filas quedan Enviado', async () => {
    // El @Cron de cada minuto puede adelantarse; se itera hasta que no queden pendientes.
    for (let i = 0; i < 3; i += 1) {
      await procesador().procesarPendientes(new Date(Date.now() + (i + 1) * 60_000));
    }

    expect(transporte.mensajes).toHaveLength(9);
    expect(
      await ctx.prisma.notificacionSalida.count({
        where: { claveEvento: { startsWith: `vigencia:${programaId}:` }, estado: 'Enviado' },
      }),
    ).toBe(9);
    const filas = await ctx.prisma.notificacionSalida.findMany({
      where: { claveEvento: { startsWith: `vigencia:${programaId}:` } },
    });
    expect(filas.every((fila) => fila.enviadoAt !== null && fila.ultimoError === null)).toBe(true);
    expect(new Set(filas.map((fila) => fila.destinatarioCorreo))).toEqual(
      new Set([
        USUARIOS_SEMILLA.Administrador.correo,
        'superadmin@uniautonoma.edu.co',
        USUARIOS_SEMILLA.Revisor.correo,
      ]),
    );

    // Sin pendientes, otra corrida no reenvía.
    const segundaCorrida = await procesador().procesarPendientes(new Date(Date.now() + 120_000));
    expect(segundaCorrida.enviados).toBe(0);
  });

  it('si el transporte falla siempre, la fila queda Fallido con ultimoError tras CORREO_MAX_INTENTOS', async () => {
    // Este programa se crea aquí para que las evaluaciones del caso anterior no lo incluyan.
    const programaFallaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Alertas outbox fallido E2E',
        slug: 'alertas-fallo-e2e',
        fechaResolucion: FECHA_RESOLUCION,
      })
    ).id;
    await asignarPrograma(ctx.prisma, revisorId, programaFallaId);

    // El transporte falla desde antes de generar el evento (ni siquiera el @Cron puede enviarlo).
    transporte.fallarSiguientes(1000);
    await evaluador().evaluarTodasLasEntidades(REFERENCIA_ROJA);
    expect(await contarSalida(programaFallaId)).toBe(3);

    // CORREO_MAX_INTENTOS=2: dos corridas bastan; se itera por si el @Cron consumió un intento.
    for (let i = 0; i < 3; i += 1) {
      await procesador().procesarPendientes(new Date(Date.now() + (i + 1) * 120_000));
    }

    const filas = await ctx.prisma.notificacionSalida.findMany({
      where: { claveEvento: { startsWith: `vigencia:${programaFallaId}:` } },
    });
    expect(filas).toHaveLength(3);
    for (const fila of filas) {
      expect(fila.estado).toBe('Fallido');
      expect(fila.intentos).toBeGreaterThanOrEqual(2);
      expect(fila.ultimoError).toMatch(/Fallo simulado del proveedor de correo/);
      expect(fila.enviadoAt).toBeNull();
    }

    // C-8: la bitácora del outbox lista las filas fallidas para Administrador/SuperAdmin.
    const { body } = await request(servidor())
      .get('/api/v1/notificaciones/salida?estado=Fallido&page=1&limit=50')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const idsFallidos = new Set<string>(filas.map((fila) => fila.id));
    expect(
      (body.datos as { id: string; ultimoError: string | null }[]).filter((fila) =>
        idsFallidos.has(fila.id),
      ),
    ).toHaveLength(3);
    expect(body.total).toBeGreaterThanOrEqual(3);

    const sinPayload = (body.datos as Record<string, unknown>[]).every(
      (fila) => !('payload' in fila),
    );
    expect(sinPayload).toBe(true);

    await request(servidor())
      .get('/api/v1/notificaciones/salida')
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .expect(403);
  });
});
