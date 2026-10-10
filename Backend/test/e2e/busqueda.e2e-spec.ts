import { CodigoDocumentoGuia, EstadoEvidencia, RolUsuario } from '@prisma/client';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import {
  asignarPrograma,
  crearEvidencia,
  crearPrograma,
  crearUsuarioE2E,
  idInstitucion,
} from '../utilidades/datos-e2e';

/**
 * R-008.1a / R-008.1b / R-008.1c: búsqueda contra PostgreSQL real
 * (FTS con searchVector + unaccent, filtros por puntaje y alcance por rol).
 */
describe('Búsqueda de evidencias contra PostgreSQL (HU-008)', () => {
  let ctx: ContextoE2E;
  let tokenAdmin: string;
  let tokenCargador: string;
  let tokenRevisor: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);

    const admin = await iniciarSesion(ctx.app, 'Administrador');
    const cargador = await iniciarSesion(ctx.app, 'Cargador');
    const revisor = await iniciarSesion(ctx.app, 'Revisor');
    tokenAdmin = admin.token;
    tokenCargador = cargador.token;
    tokenRevisor = revisor.token;

    await ctx.prisma.usuario.updateMany({
      where: { id: { in: [cargador.usuarioId, revisor.usuarioId] } },
      data: { responsableProcesoInstitucional: true },
    });

    const derecho = await crearPrograma(ctx.prisma, { nombre: 'Derecho', slug: 'derecho' });
    const medicina = await crearPrograma(ctx.prisma, { nombre: 'Medicina', slug: 'medicina' });
    await asignarPrograma(ctx.prisma, cargador.usuarioId, derecho.id);
    await asignarPrograma(ctx.prisma, revisor.usuarioId, derecho.id);
    const otroCargador = await crearUsuarioE2E(ctx.prisma, {
      alias: 'otro.cargador',
      rol: RolUsuario.Cargador,
      contrasena: 'Clave-e2e-1',
    });
    const institucionId = await idInstitucion(ctx.prisma);

    const base = { codigoGuia: CodigoDocumentoGuia.G1, total: 9 };
    ids.derecho4 = (await crearEvidencia(ctx.prisma, { ...base, nombre: 'Documento maestro Derecho', autorId: cargador.usuarioId, programaId: derecho.id, estado: EstadoEvidencia.ConObservaciones, puntaje: 4 })).id;
    ids.derecho5 = (await crearEvidencia(ctx.prisma, { ...base, nombre: 'Currículo y plan de estudios Derecho', autorId: cargador.usuarioId, programaId: derecho.id, estado: EstadoEvidencia.ConObservaciones, puntaje: 5 })).id;
    ids.derecho9 = (await crearEvidencia(ctx.prisma, { ...base, nombre: 'Condiciones de calidad Derecho', autorId: cargador.usuarioId, programaId: derecho.id, estado: EstadoEvidencia.Cumple, puntaje: 9 })).id;
    ids.medicina9 = (await crearEvidencia(ctx.prisma, { ...base, nombre: 'Condiciones de calidad Medicina', autorId: otroCargador.id, programaId: medicina.id, estado: EstadoEvidencia.Cumple, puntaje: 9 })).id;
    ids.g3Propio = (await crearEvidencia(ctx.prisma, { nombre: 'Condiciones institucionales propias', autorId: cargador.usuarioId, institucionId, codigoGuia: CodigoDocumentoGuia.G3, estado: EstadoEvidencia.Borrador })).id;
    ids.g3Ajeno = (await crearEvidencia(ctx.prisma, { nombre: 'Condiciones institucionales ajenas', autorId: otroCargador.id, institucionId, codigoGuia: CodigoDocumentoGuia.G3, estado: EstadoEvidencia.EnRevision })).id;
    ids.g4Borrador = (await crearEvidencia(ctx.prisma, { nombre: 'Renovación institucional en borrador', autorId: otroCargador.id, institucionId, codigoGuia: CodigoDocumentoGuia.G4, estado: EstadoEvidencia.Borrador })).id;
  });

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function buscar(token: string, consulta: string) {
    return request(ctx.app.getHttpServer())
      .get(`/api/v1/busqueda?${consulta}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  }

  const idsDe = (filas: { id: string }[]) => filas.map((f) => f.id).sort();

  it('la columna searchVector existe y es GENERATED (no la borró ninguna migración)', async () => {
    const filas = await ctx.prisma.$queryRaw<{ is_generated: string; data_type: string }[]>`
      SELECT is_generated, data_type FROM information_schema.columns
      WHERE table_name = 'Evidencia' AND column_name = 'searchVector'`;
    expect(filas).toEqual([{ is_generated: 'ALWAYS', data_type: 'tsvector' }]);
  });

  it('?programa=derecho&puntajeMin=5 devuelve solo 5/9 y 9/9 (5/9 incluido)', async () => {
    const { body } = await buscar(tokenAdmin, 'programa=derecho&puntajeMin=5');
    expect(body.total).toBe(2);
    expect(idsDe(body.resultados)).toEqual([ids.derecho5, ids.derecho9].sort());
  });

  it('q=curriculo (sin tilde) encuentra "Currículo" con FTS + unaccent', async () => {
    const { body } = await buscar(tokenAdmin, 'q=curriculo');
    expect(idsDe(body.resultados)).toEqual([ids.derecho5]);
  });

  it('el Administrador no ve borradores nunca enviados', async () => {
    const { body } = await buscar(tokenAdmin, 'limite=50');
    const vistos = idsDe(body.resultados);
    expect(vistos).not.toContain(ids.g3Propio);
    expect(vistos).not.toContain(ids.g4Borrador);
    expect(vistos).toContain(ids.g3Ajeno);
  });

  it('el Cargador ve su G3 institucional y no el G3 de otro Cargador', async () => {
    const { body } = await buscar(tokenCargador, 'codigoGuia=G3');
    expect(idsDe(body.resultados)).toEqual([ids.g3Propio]);
  });

  it('el Cargador también ve su G3 en GET /evidencias y nada de Medicina', async () => {
    const { body } = await request(ctx.app.getHttpServer())
      .get('/api/v1/evidencias?limite=50')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(200);
    const vistos = idsDe(body.datos);
    expect(vistos).toContain(ids.g3Propio);
    expect(vistos).not.toContain(ids.g3Ajeno);
    expect(vistos).not.toContain(ids.medicina9);
  });

  it('el Revisor ve los institucionales enviados de su alcance, no los borradores', async () => {
    const { body } = await buscar(tokenRevisor, 'limite=50');
    const vistos = idsDe(body.resultados);
    expect(vistos).toContain(ids.g3Ajeno);
    expect(vistos).not.toContain(ids.g4Borrador);
    expect(vistos).not.toContain(ids.g3Propio);
    expect(vistos).not.toContain(ids.medicina9);
    expect(vistos).toEqual(expect.arrayContaining([ids.derecho4, ids.derecho5, ids.derecho9]));
  });
});
