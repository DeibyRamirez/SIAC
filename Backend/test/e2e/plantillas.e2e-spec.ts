import request from 'supertest';
import { ContextoE2E, crearAppE2E, iniciarSesion } from '../utilidades/app-e2e';

/**
 * HU-005 / D-1 (auditoría 20/10/2026): `GET /api/v1/plantillas?tipoTramite=` valida el
 * filtro contra el enum `TipoTramitePlantilla`. Un valor desconocido responde 400 con
 * mensaje en español (antes llegaba a Prisma y respondía 500); uno válido o ausente, 200.
 */
describe('Listado de plantillas: validación de tipoTramite (HU-005)', () => {
  let ctx: ContextoE2E;
  let tokenAdmin: string;
  let tokenCargador: string;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E();
    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;
    tokenCargador = (await iniciarSesion(ctx.app, 'Cargador')).token;
  });

  afterAll(async () => {
    if (ctx) await ctx.app.close();
  });

  function listar(token: string, query = '') {
    return request(servidor())
      .get(`/api/v1/plantillas${query}`)
      .set('Authorization', `Bearer ${token}`);
  }

  it('tipoTramite desconocido → 400 con mensaje en español', async () => {
    const { body } = await listar(tokenAdmin, '?tipoTramite=xyz').expect(400);
    expect(JSON.stringify(body)).toContain('tipoTramite no es válido');
    expect(JSON.stringify(body)).toContain('Renovacion, NuevoPrograma, General');
  });

  it('el Cargador también recibe 400 (no 500) con un valor inválido', async () => {
    await listar(tokenCargador, '?tipoTramite=renovacion').expect(400);
  });

  it.each(['Renovacion', 'NuevoPrograma', 'General'])(
    'tipoTramite=%s → 200 con una lista',
    async (tipo) => {
      const { body } = await listar(tokenAdmin, `?tipoTramite=${tipo}`).expect(200);
      expect(Array.isArray(body)).toBe(true);
    },
  );

  it('sin tipoTramite → 200 (listado sin filtro)', async () => {
    const { body } = await listar(tokenAdmin).expect(200);
    expect(Array.isArray(body)).toBe(true);
  });
});
