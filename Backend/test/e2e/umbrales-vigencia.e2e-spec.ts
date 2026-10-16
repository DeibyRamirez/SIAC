import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { crearPrograma } from '../utilidades/datos-e2e';
import { ConfiguracionSiacService } from '../../src/configuracion/configuracion-siac.service';
import { EvaluadorVigenciaRegistroService } from '../../src/vigencias/evaluador-vigencia-registro.service';

/**
 * T-007.3a (CA): umbrales de vigencia editables desde la API.
 * - GET/PATCH `/api/v1/configuracion/vigencia` restringidos a SuperAdmin/Administrador.
 * - PATCH valida rango y coherencia (400) y el siguiente cálculo del semáforo usa los
 *   valores nuevos sin redeploy: un programa pasa de Verde a Amarillo al subir el aviso.
 */
describe('Umbrales de vigencia configurables (T-007.3a)', () => {
  let ctx: ContextoE2E;
  let tokenAdmin: string;
  let tokenCargador: string;
  let tokenRevisor: string;
  let umbralesOriginales: { mesesAvisoVigencia: number; mesesRojoVigencia: number };

  const servidor = () => ctx.app.getHttpServer();
  const FECHA_RESOLUCION = new Date('2020-01-01T00:00:00.000Z');
  // Con aviso 24 → amarillo desde 2025-01-01 (Verde en esta referencia);
  // con aviso 30 → amarillo desde 2024-07-01 (Amarillo en la misma referencia).
  const REFERENCIA_ENTRE_UMBRALES = new Date('2024-09-01T12:00:00.000Z');

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);

    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;
    tokenCargador = (await iniciarSesion(ctx.app, 'Cargador')).token;
    tokenRevisor = (await iniciarSesion(ctx.app, 'Revisor')).token;

    const fila = await ctx.prisma.configuracionSIAC.findUnique({ where: { id: 'global' } });
    umbralesOriginales = {
      mesesAvisoVigencia: fila?.mesesAvisoVigencia ?? 24,
      mesesRojoVigencia: fila?.mesesRojoVigencia ?? 18,
    };
    // Estado determinista del caso: umbrales por defecto del PO.
    await ctx.prisma.configuracionSIAC.update({
      where: { id: 'global' },
      data: { mesesAvisoVigencia: 24, mesesRojoVigencia: 18 },
    });
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.configuracionSIAC.update({
        where: { id: 'global' },
        data: umbralesOriginales,
      });
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function obtenerVigencia(token: string) {
    return request(servidor())
      .get('/api/v1/configuracion/vigencia')
      .set('Authorization', `Bearer ${token}`);
  }

  function actualizarVigencia(
    token: string,
    cuerpo: Record<string, unknown>,
  ) {
    return request(servidor())
      .patch('/api/v1/configuracion/vigencia')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);
  }

  it('GET devuelve los umbrales vigentes y exige SuperAdmin/Administrador (403 al resto)', async () => {
    const { body } = await obtenerVigencia(tokenAdmin).expect(200);
    expect(body).toEqual({ aniosVigencia: 7, mesesAvisoVigencia: 24, mesesRojoVigencia: 18 });

    await obtenerVigencia(tokenCargador).expect(403);
    await obtenerVigencia(tokenRevisor).expect(403);
  });

  it('PATCH valida rango y coherencia antes de persistir (400 con mensaje claro)', async () => {
    const incoherente = await actualizarVigencia(tokenAdmin, {
      mesesAvisoVigencia: 6,
      mesesRojoVigencia: 18,
    }).expect(400);
    expect(JSON.stringify(incoherente.body)).toMatch(/mayor que mesesRojoVigencia/);

    const fueraDeRango = await actualizarVigencia(tokenAdmin, {
      mesesAvisoVigencia: 90,
      mesesRojoVigencia: 18,
    }).expect(400);
    expect(JSON.stringify(fueraDeRango.body)).toMatch(/no puede superar 84 meses/);

    const rojoCero = await actualizarVigencia(tokenAdmin, {
      mesesAvisoVigencia: 24,
      mesesRojoVigencia: 0,
    }).expect(400);
    expect(JSON.stringify(rojoCero.body)).toMatch(/mayor que 0/);

    await actualizarVigencia(tokenCargador, {
      mesesAvisoVigencia: 30,
      mesesRojoVigencia: 6,
    }).expect(403);

    const sinCambios = await obtenerVigencia(tokenAdmin).expect(200);
    expect(sinCambios.body.mesesAvisoVigencia).toBe(24);
  });

  it('al subir el aviso, el siguiente cálculo del semáforo pasa el programa de Verde a Amarillo', async () => {
    const programa = await crearPrograma(ctx.prisma, {
      nombre: 'Umbrales E2E',
      slug: 'umbrales-e2e',
      fechaResolucion: FECHA_RESOLUCION,
    });
    const evaluador = ctx.app.get(EvaluadorVigenciaRegistroService);

    // Con 24/18 el hito amarillo es 2025-01-01: nada que notificar en la referencia.
    await evaluador.evaluarTodasLasEntidades(REFERENCIA_ENTRE_UMBRALES);
    expect(
      await ctx.prisma.alertaInApp.count({
        where: { metadata: { path: ['programaId'], equals: programa.id } },
      }),
    ).toBe(0);

    const { body: actualizados } = await actualizarVigencia(tokenAdmin, {
      mesesAvisoVigencia: 30,
      mesesRojoVigencia: 6,
    }).expect(200);
    expect(actualizados).toEqual({ aniosVigencia: 7, mesesAvisoVigencia: 30, mesesRojoVigencia: 6 });
    expect(ctx.app.get(ConfiguracionSiacService).obtener().mesesAvisoVigencia).toBe(30);

    // El evaluador relee la BD: con aviso 30 el hito amarillo es 2024-07-01 → Amarillo.
    await evaluador.evaluarTodasLasEntidades(REFERENCIA_ENTRE_UMBRALES);
    const alerta = await ctx.prisma.alertaInApp.findFirst({
      where: {
        tipo: 'vigencia_amarilla',
        metadata: { path: ['programaId'], equals: programa.id },
      },
    });
    expect(alerta).not.toBeNull();
    expect(alerta?.metadata).toMatchObject({ umbral: 'amarillo' });

    // Reejecutar el mismo cálculo no duplica el evento (claveEvento única).
    const antes = await ctx.prisma.alertaInApp.count({
      where: { metadata: { path: ['programaId'], equals: programa.id } },
    });
    await evaluador.evaluarTodasLasEntidades(REFERENCIA_ENTRE_UMBRALES);
    expect(
      await ctx.prisma.alertaInApp.count({
        where: { metadata: { path: ['programaId'], equals: programa.id } },
      }),
    ).toBe(antes);
  });
});
