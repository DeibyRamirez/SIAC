import request from 'supertest';
import { ContextoE2E, crearAppE2E } from '../utilidades/app-e2e';

describe('Health check E2E (despliegue Render)', () => {
  let ctx: ContextoE2E;

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
  });

  afterAll(async () => {
    await ctx?.app.close();
  });

  it('GET /api/v1/salud responde 200 sin token y con la BD conectada', async () => {
    const respuesta = await request(ctx.app.getHttpServer()).get('/api/v1/salud').expect(200);
    expect(respuesta.body).toMatchObject({ estado: 'ok', baseDatos: 'ok' });
  });
});
