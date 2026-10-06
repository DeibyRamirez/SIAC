import request from 'supertest';
import { ContextoE2E, crearAppE2E, iniciarSesion } from '../utilidades/app-e2e';

describe('Humo E2E de la API (R-010.5)', () => {
  let ctx: ContextoE2E;

  beforeAll(async () => {
    ctx = await crearAppE2E();
  });

  afterAll(async () => {
    await ctx?.app.close();
  });

  it('GET /api/v1/auth/perfil sin token responde 401', async () => {
    await request(ctx.app.getHttpServer()).get('/api/v1/auth/perfil').expect(401);
  });

  it('el Administrador semilla inicia sesión y consulta su perfil', async () => {
    const { token } = await iniciarSesion(ctx.app, 'Administrador');
    const perfil = await request(ctx.app.getHttpServer())
      .get('/api/v1/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(perfil.body.rol).toBe('Administrador');
  });
});
