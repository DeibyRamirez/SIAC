import request from 'supertest';
import { ContextoE2E, crearAppE2E } from '../utilidades/app-e2e';

/**
 * Eliminación del rol Par académico (migración 20261020220000_eliminar_rol_par_academico).
 * El enum de PostgreSQL ya no admite el valor y el usuario semilla del Par no existe ni inicia
 * sesión. Los usuarios que tenían el rol quedan desactivados (ver la migración).
 */
describe('Rol Par académico eliminado', () => {
  let ctx: ContextoE2E;

  beforeAll(async () => {
    ctx = await crearAppE2E();
  });

  afterAll(async () => {
    if (ctx) await ctx.app.close();
  });

  it('el enum RolUsuario de la BD solo tiene Cargador, Revisor, Administrador y SuperAdmin', async () => {
    const filas = await ctx.prisma.$queryRaw<{ valor: string }[]>`
      SELECT unnest(enum_range(NULL::"RolUsuario"))::text AS valor`;
    expect(filas.map((f) => f.valor)).toEqual([
      'Cargador',
      'Revisor',
      'Administrador',
      'SuperAdmin',
    ]);
  });

  it('la BD rechaza el valor ParAcademico', async () => {
    await expect(
      ctx.prisma.$executeRawUnsafe(`SELECT 'ParAcademico'::"RolUsuario"`),
    ).rejects.toThrow();
  });

  it('ningún usuario activo conserva el antiguo correo del Par y el login falla', async () => {
    const par = await ctx.prisma.usuario.findUnique({
      where: { correo: 'par.academico@uniautonoma.edu.co' },
    });
    expect(par?.activo ?? false).toBe(false);

    await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: 'par.academico@uniautonoma.edu.co', contrasena: 'cualquiera-123' })
      .expect(401);
  });
});
