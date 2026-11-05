import request from 'supertest';
import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio } from '../utilidades/app-e2e';

const ESTUDIANTE = {
  programa: 'Ingeniería Agropecuaria',
  genero: 'Femenino',
  facultad: 'Facultad de Ciencias Agrarias',
  semestre: 5,
  estrato: 2,
  valor_dimension: 1,
  codigo_estudiante: '2020002350129',
  periodo_academico: '2026-1',
  nombre_estudiante: 'Ana Pérez E2E',
};

describe('Camino 2: cifras institucionales', () => {
  let ctx: ContextoE2E;
  let tokenSuper: string;
  let clave: string;
  let integradorId: string;

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);
    const sesion = await iniciarSesion(ctx.app, 'SuperAdmin');
    tokenSuper = sesion.token;
  });

  afterAll(async () => {
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  const http = () => request(ctx.app.getHttpServer());

  it('el SuperAdmin crea la clave una vez y el listado no la devuelve', async () => {
    const creada = await http()
      .post('/api/v1/integracion/claves')
      .set('Authorization', `Bearer ${tokenSuper}`)
      .send({ nombre: 'SIGA e2e' })
      .expect(201);
    clave = creada.body.clave as string;
    integradorId = creada.body.id as string;
    expect(clave.startsWith('siac_')).toBe(true);
    expect(creada.body.hashClave).toBeUndefined();

    const lista = await http()
      .get('/api/v1/integracion/claves')
      .set('Authorization', `Bearer ${tokenSuper}`)
      .expect(200);
    expect(JSON.stringify(lista.body)).not.toContain(clave);
    expect(JSON.stringify(lista.body)).not.toContain('hashClave');
    expect(lista.body[0].nombre).toBe('SIGA e2e');
  });

  it('el Administrador no administra claves y una petición sin clave responde 401', async () => {
    const admin = await iniciarSesion(ctx.app, 'Administrador');
    await http()
      .post('/api/v1/integracion/claves')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'No permitido' })
      .expect(403);
    await http()
      .get('/api/v1/integracion/cifras-institucionales/estudiantes')
      .expect(401);
  });

  it('guarda el lote, oculta los datos personales en el GET y los conserva en la base', async () => {
    const envio = await http()
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', clave)
      .send({ periodo: '2026-1', registros: [ESTUDIANTE] })
      .expect(200);
    expect(envio.body).toEqual({ filasOk: 1, filasError: 0, errores: [] });

    const lista = await http()
      .get('/api/v1/integracion/cifras-institucionales/estudiantes')
      .query({ periodo: '2026-1', pagina: '1', limite: '20' })
      .set('x-api-key', clave)
      .expect(200);
    expect(lista.body.total).toBe(1);
    expect(lista.body.pagina).toBe(1);
    expect(lista.body.limite).toBe(20);
    expect(lista.body.datos[0].programa).toBe('Ingeniería Agropecuaria');
    expect(JSON.stringify(lista.body)).not.toContain('Ana Pérez E2E');
    expect(JSON.stringify(lista.body)).not.toContain('2020002350129');

    const guardado = await ctx.prisma.cifraEstudiante.findMany();
    expect(guardado).toHaveLength(1);
    expect(guardado[0].nombreEstudiante).toBe('Ana Pérez E2E');
    expect(guardado[0].codigoEstudiante).toBe('2020002350129');
    expect(guardado[0].integradorId).toBe(integradorId);
  });

  it('un lote inválido responde 400 y no reemplaza las filas', async () => {
    const invalido = await http()
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', clave)
      .send({ registros: [{ ...ESTUDIANTE, genero: 'Otro' }] })
      .expect(400);
    expect(invalido.body.filasError).toBe(1);
    expect(invalido.body.errores[0].columna).toBe('genero');
    expect(await ctx.prisma.cifraEstudiante.count()).toBe(1);
  });

  it('reemplaza el periodo y deja la sede de infraestructura por separado', async () => {
    await http()
      .post('/api/v1/integracion/cifras-institucionales/estudiantes/envios')
      .set('x-api-key', clave)
      .send({
        registros: [{ ...ESTUDIANTE, programa: 'Reemplazado', codigo_estudiante: '999' }],
      })
      .expect(200);
    const filas = await ctx.prisma.cifraEstudiante.findMany();
    expect(filas).toHaveLength(1);
    expect(filas[0].programa).toBe('Reemplazado');

    const sede = {
      sede: 'Claustro El Carmen',
      direccion: 'Calle 5 # 4-70',
      numero_pisos: 2,
      estado: 'En uso',
      total_m2_area_construida: 10,
      total_m2_area_terreno: 8,
      cantidad_salones_clase: 1,
      area_m2_salon_clase: 1,
      cantidad_salas_sistemas: 0,
      area_m2_salas_sistemas: 0,
      cantidad_laboratorios: 0,
      area_m2_laboratorios: 0,
      cantidad_auditorios: 0,
      area_m2_auditorios: 0,
      cantidad_salas_lectura: 0,
      area_m2_salas_lectura: 0,
      cantidad_zonas_deportivas: 0,
      area_m2_zonas_deportivas: 0,
      cantidad_cafeterias: 0,
      cantidad_zonas_estudio: 0,
      cantidad_zonas_recreativas: 0,
    };
    await http()
      .post('/api/v1/integracion/cifras-institucionales/infraestructura/envios')
      .set('x-api-key', clave)
      .send({ registros: [sede] })
      .expect(200);
    const lectura = await http()
      .get('/api/v1/integracion/cifras-institucionales/infraestructura')
      .query({ sede: 'Claustro El Carmen' })
      .set('x-api-key', clave)
      .expect(200);
    expect(lectura.body.total).toBe(1);
    expect(lectura.body.datos[0].direccion).toBe('Calle 5 # 4-70');
  });

  it('acepta bienestar y relaciones con el entorno', async () => {
    const bienestar = await http()
      .post('/api/v1/integracion/cifras-institucionales/bienestar/envios')
      .set('x-api-key', clave)
      .send({
        periodo: '2026-1',
        registros: [
          {
            facultad: 'Facultad de Ingeniería',
            programa: 'Ingeniería de Sistemas',
            genero: 'Femenino',
            linea_bienestar: 'Salud',
            servicio: 'Consulta médica',
            beneficiarios: 120,
            valor_invertido_cop: 1500000,
          },
        ],
      })
      .expect(200);
    expect(bienestar.body.filasOk).toBe(1);

    const lecturaBienestar = await http()
      .get('/api/v1/integracion/cifras-institucionales/bienestar')
      .query({ periodo: '2026-1' })
      .set('x-api-key', clave)
      .expect(200);
    expect(lecturaBienestar.body.datos[0].servicio).toBe('Consulta médica');
    expect(lecturaBienestar.body.datos[0].beneficiarios).toBe(120);

    const entorno = await http()
      .post('/api/v1/integracion/cifras-institucionales/relaciones-entorno/envios')
      .set('x-api-key', clave)
      .send({
        periodo: '2026-1',
        registros: [
          {
            facultad: 'Facultad de Ingeniería',
            programa: 'Ingeniería de Sistemas',
            tipo_relacion: 'Convenio',
            aliado: 'Empresa ABC',
            sector_aliado: 'Privado',
            ambito: 'Regional',
            fecha_inicio: '2026-01-15',
            fecha_fin: '2026-06-30',
            estudiantes_participantes: 25,
          },
        ],
      })
      .expect(200);
    expect(entorno.body.filasOk).toBe(1);

    const lecturaEntorno = await http()
      .get('/api/v1/integracion/cifras-institucionales/relaciones-entorno')
      .query({ periodo: '2026-1' })
      .set('x-api-key', clave)
      .expect(200);
    expect(lecturaEntorno.body.datos[0].aliado).toBe('Empresa ABC');
    expect(lecturaEntorno.body.datos[0].fecha_inicio).toBe('2026-01-15');
  });

  it('la vista de Power BI no expone el nombre ni el código, y el rol de lectura no puede seleccionarlos', async () => {
    const vista = await ctx.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM "v_powerbi_estudiantes"
    `;
    expect(vista.length).toBeGreaterThan(0);
    expect(Object.keys(vista[0])).not.toContain('nombreEstudiante');
    expect(Object.keys(vista[0])).not.toContain('codigoEstudiante');

    await ctx.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE siac_powerbi_lectura');
      const legible = await tx.$queryRaw<Record<string, unknown>[]>`SELECT * FROM "v_powerbi_estudiantes"`;
      expect(legible[0].programa).toBe('Reemplazado');
      await expect(
        tx.$queryRaw`SELECT "nombreEstudiante" FROM "CifraEstudiante"`,
      ).rejects.toThrow(/permission denied|permiso denegado/i);
    });
  });

  it('una clave revocada deja de autenticar', async () => {
    await http()
      .post(`/api/v1/integracion/claves/${integradorId}/revocar`)
      .set('Authorization', `Bearer ${tokenSuper}`)
      .expect(200);
    await http()
      .get('/api/v1/integracion/cifras-institucionales/estudiantes')
      .set('x-api-key', clave)
      .expect(401);
  });
});
