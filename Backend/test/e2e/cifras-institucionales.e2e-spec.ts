import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio } from '../utilidades/app-e2e';

const ESTUDIANTE = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  semestre: 5,
  estrato: 2,
  codigo_estudiante: '2020002350129',
  periodo_academico: '2026-1',
};

describe('Camino 2 cifras institucionales', () => {
  let ctx: ContextoE2E;
  let tokenAdmin: string;
  let apiKey: string;

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);
    const sesion = await iniciarSesion(ctx.app, 'Administrador');
    tokenAdmin = sesion.token;
  });

  afterAll(async () => {
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  it('el administrador crea una clave y FEAT envía un lote válido de estudiantes', async () => {
    const creada = await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/claves')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'FEAT', categorias: ['estudiantes'] })
      .expect(201);
    expect(creada.body.secreto).toMatch(/^siac_live_/);
    expect(creada.body.prefijo).toBeDefined();
    apiKey = creada.body.secreto;

    const envio = await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', apiKey)
      .send({ periodo: '2026-1', registros: [ESTUDIANTE, { ...ESTUDIANTE, codigo_estudiante: '2' }] })
      .expect(201);
    expect(envio.body.filasOk).toBe(2);
    expect(envio.body.filasError).toBe(0);

    const datos = await request(ctx.app.getHttpServer())
      .get('/api/v1/integracion/cifras-institucionales/estudiantes/datos')
      .set('x-api-key', apiKey)
      .expect(200);
    expect(datos.body.total).toBe(2);
    expect(datos.body.datos[0].nombreEstudiante).toBeUndefined();
    expect(datos.body.datos[0].codigoEstudiante).toBeDefined();

    const vista = await ctx.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM "v_powerbi_cifras_estudiantes"`;
    expect(vista.length).toBeGreaterThan(0);
    expect(vista[0]).not.toHaveProperty('nombreEstudiante');
    expect(vista[0]).toHaveProperty('codigoEstudiante');
  });

  it('sin clave responde 401 y una fila inválida no persiste nada', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .send({ periodo: '2026-1', registros: [ESTUDIANTE] })
      .expect(401);

    const antes = await ctx.prisma.cifraEstudiante.count();
    const fallo = await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', apiKey)
      .send({ periodo: '2026-1', registros: [{ ...ESTUDIANTE, semestre: 99 }] })
      .expect(400);
    expect(fallo.body.codigo).toBe('CIFRAS_LOTE_INVALIDO');
    expect(fallo.body.errores[0].columna).toBe('semestre');
    await expect(ctx.prisma.cifraEstudiante.count()).resolves.toBe(antes);
  });

  it('una clave de otra categoría recibe 403', async () => {
    const otra = await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/claves')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'INV', categorias: ['investigacion'] })
      .expect(201);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', otra.body.secreto)
      .send({ periodo: '2026-1', registros: [ESTUDIANTE] })
      .expect(403);
  });

  it('el reemplazo por periodo sustituye las filas anteriores', async () => {
    await request(ctx.app.getHttpServer())
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', apiKey)
      .send({ periodo: '2026-1', registros: [{ ...ESTUDIANTE, codigo_estudiante: 'unico' }] })
      .expect(201);
    const filas = await ctx.prisma.cifraEstudiante.findMany({ where: { periodoAcademico: '2026-1' } });
    expect(filas).toHaveLength(1);
    expect(filas[0].codigoEstudiante).toBe('unico');
  });

  const urlPowerbi = process.env.DATABASE_URL_POWERBI;
  (urlPowerbi ? it : it.skip)(
    'siac_powerbi_lectura lee la vista y no la columna nombreEstudiante',
    async () => {
      const powerbi = new PrismaClient({ datasourceUrl: urlPowerbi });
      try {
        const filas = await powerbi.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM "v_powerbi_cifras_estudiantes"`;
        expect(filas.length).toBeGreaterThan(0);
        expect(filas[0]).not.toHaveProperty('nombreEstudiante');
        await expect(
          powerbi.$queryRaw`SELECT "nombreEstudiante" FROM "CifraEstudiante"`,
        ).rejects.toThrow(/permission denied/);
      } finally {
        await powerbi.$disconnect();
      }
    },
  );
});
