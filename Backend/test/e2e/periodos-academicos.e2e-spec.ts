import request from 'supertest';
import { CodigoDocumentoGuia, EstadoEvidencia } from '@prisma/client';
import { periodoAcademicoEnBogota } from '../../src/dominio/periodo-academico';
import { ContextoE2E, crearAppE2E, iniciarSesion, limpiarDatosNegocio } from '../utilidades/app-e2e';
import { asignarPrograma, crearEvidencia, crearPrograma } from '../utilidades/datos-e2e';
import { MIME_DOCX, crearDocxE2E } from '../utilidades/docx-e2e';

/**
 * Conservación histórica: en un periodo posterior (el caso de referencia es 2027-2),
 * elegir 2026-2 sigue devolviendo todas las evidencias, las cifras y el semáforo de 2026-2.
 * Nada se borra ni se oculta por consultar otro periodo.
 */
describe('Periodos académicos: validación, vigencia y conservación', () => {
  let ctx: ContextoE2E;
  let tokenCargador: string;
  let tokenAdmin: string;
  let cargadorId: string;
  let programaId: string;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E({ correoNulo: true });
    await limpiarDatosNegocio(ctx.prisma);
    ({ token: tokenCargador, usuarioId: cargadorId } = await iniciarSesion(ctx.app, 'Cargador'));
    ({ token: tokenAdmin } = await iniciarSesion(ctx.app, 'Administrador'));
    programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Historia académica',
        slug: 'historia-academica',
      })
    ).id;
    await asignarPrograma(ctx.prisma, cargadorId, programaId);

    await crearEvidencia(ctx.prisma, {
      nombre: 'Borrador de cifra 2026-2',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Cumple,
      periodo: '2026-2',
      puntaje: 4,
      total: 9,
    });
    await crearEvidencia(ctx.prisma, {
      nombre: 'Maestro completo 2026-2',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.Cumple,
      periodo: '2026-2',
      puntaje: 9,
      total: 9,
    });
    await crearEvidencia(ctx.prisma, {
      nombre: 'Maestro 2027-2',
      autorId: cargadorId,
      programaId,
      codigoGuia: CodigoDocumentoGuia.G1,
      estado: EstadoEvidencia.ConObservaciones,
      periodo: '2027-2',
      puntaje: 1,
      total: 9,
    });
  });

  afterAll(async () => {
    if (!ctx) return;
    await limpiarDatosNegocio(ctx.prisma);
    await ctx.app.close();
  });

  it('GET /documentos/periodos/actual usa el semestre de Bogotá', async () => {
    const { body } = await request(servidor())
      .get('/api/v1/documentos/periodos/actual')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(body.zonaHoraria).toBe('America/Bogota');
    expect(body.periodo).toBe(periodoAcademicoEnBogota());
    expect(body.periodo).toMatch(/^\d{4}-[12]$/);
  });

  it('en 2027-2, 2026-2 sigue completo: evidencias, cifras y semáforo, sin borrar nada', async () => {
    const antes = await ctx.prisma.evidencia.count({ where: { periodo: '2026-2' } });
    expect(antes).toBe(2);

    const { body: periodos } = await request(servidor())
      .get('/api/v1/documentos/periodos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(periodos.periodos).toEqual(expect.arrayContaining(['2026-2', '2027-2']));

    const { body: lista } = await request(servidor())
      .get('/api/v1/evidencias?periodo=2026-2&limite=50')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const nombres = JSON.stringify(lista);
    expect(nombres).toContain('Borrador de cifra 2026-2');
    expect(nombres).toContain('Maestro completo 2026-2');
    expect(nombres).not.toContain('Maestro 2027-2');
    expect(lista.total).toBe(2);

    const { body: panel2026 } = await request(servidor())
      .get('/api/v1/programas/panel?semestre=2026-2')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const fila2026 = panel2026.datos.find((fila: { id: string }) => fila.id === programaId);
    const g1_2026 = fila2026.documentos.find((doc: { codigoGuia: string }) => doc.codigoGuia === 'G1');
    expect(fila2026.semestre).toBe('2026-2');
    expect(g1_2026.puntaje).toBe(9);
    expect(fila2026.avancePorcentual).toBe(100);
    expect(fila2026.semaforoAvance).toBe('Verde');

    const { body: panel2027 } = await request(servidor())
      .get('/api/v1/programas/panel?semestre=2027-2')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const fila2027 = panel2027.datos.find((fila: { id: string }) => fila.id === programaId);
    const g1_2027 = fila2027.documentos.find((doc: { codigoGuia: string }) => doc.codigoGuia === 'G1');
    expect(fila2027.semestre).toBe('2027-2');
    expect(g1_2027.puntaje).toBe(1);
    expect(fila2027.semaforoAvance).toBe('Rojo');

    const despues = await ctx.prisma.evidencia.count({ where: { periodo: '2026-2' } });
    expect(despues).toBe(antes);
  });

  it('el Cargador no sube a un periodo cerrado ni con un formato inválido', async () => {
    const docx = await crearDocxE2E('Intento historico');
    const pasado = await request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', 'Intento historico')
      .field('programaId', programaId)
      .field('periodo', '2020-1')
      .field('codigoGuia', 'G1')
      .attach('archivo', docx, { filename: 'intento.docx', contentType: MIME_DOCX })
      .expect(400);
    expect(JSON.stringify(pasado.body)).toMatch(/ya cerró/);

    const invalido = await request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', 'Formato malo')
      .field('programaId', programaId)
      .field('periodo', '2026-3')
      .field('codigoGuia', 'G1')
      .attach('archivo', docx, { filename: 'formato.docx', contentType: MIME_DOCX })
      .expect(400);
    expect(JSON.stringify(invalido.body)).toMatch(/AAAA-1 o AAAA-2/);

    const historicas = await ctx.prisma.evidencia.count({ where: { periodo: '2020-1' } });
    expect(historicas).toBe(0);
  });
});
