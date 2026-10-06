import { TipoTramiteSIAC } from '@prisma/client';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { asignarPrograma, crearPrograma, idInstitucion } from '../utilidades/datos-e2e';
import { MIME_DOCX, crearDocxE2E } from '../utilidades/docx-e2e';

/**
 * HU-010 (auditoría F.3, cierre del PR #7): propietario único de la evidencia.
 * G3/G4 → institución sin elegir programa; G1/G2 → programa; CHECK en BD.
 */
describe('Propietario de la evidencia (HU-010)', () => {
  let ctx: ContextoE2E;
  let tokenCargador: string;
  let tokenAdmin: string;
  let cargadorId: string;
  let derechoId: string;
  let institucionId: string;
  let docx: Buffer;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);
    const cargador = await iniciarSesion(ctx.app, 'Cargador');
    tokenCargador = cargador.token;
    cargadorId = cargador.usuarioId;
    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;
    institucionId = await idInstitucion(ctx.prisma);
    derechoId = (await crearPrograma(ctx.prisma, { nombre: 'Derecho', slug: 'derecho' })).id;
    await asignarPrograma(ctx.prisma, cargadorId, derechoId);
    docx = await crearDocxE2E('Documento');
  });

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function subir(campos: Record<string, string>) {
    let peticion = request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', 'Documento de prueba')
      .field('periodo', '2026-2');
    for (const [campo, valor] of Object.entries(campos)) peticion = peticion.field(campo, valor);
    return peticion.attach('archivo', docx, {
      filename: 'documento.docx',
      contentType: MIME_DOCX,
    });
  }

  it('el Cargador sube un G3 sin elegir programa y queda en la institución', async () => {
    const { body } = await subir({ codigoGuia: 'G3' }).expect(201);
    expect(body.institucionId).toBe(institucionId);
    expect(body.programaId).toBeNull();
    expect(body.institucion).toMatchObject({ id: institucionId, codigo: 'CUAC' });
  });

  it('un G3 con programa responde 400', async () => {
    await subir({ codigoGuia: 'G3', programaId: derechoId }).expect(400);
  });

  it('un G1 sin programa o con institución responde 400', async () => {
    await subir({ codigoGuia: 'G1' }).expect(400);
    await subir({ codigoGuia: 'G1', programaId: derechoId, institucionId }).expect(400);
  });

  it('un G1 con programa asignado queda en el programa', async () => {
    const { body } = await subir({ codigoGuia: 'G1', programaId: derechoId }).expect(201);
    expect(body.programaId).toBe(derechoId);
    expect(body.institucionId).toBeNull();
  });

  it('la BD rechaza por CHECK una evidencia G3 con programa', async () => {
    await expect(
      ctx.prisma.evidencia.create({
        data: {
          nombre: 'G3 con programa',
          periodo: '2026-2',
          nombreArchivo: 'g3.docx',
          codigoGuia: 'G3',
          autor: { connect: { id: cargadorId } },
          programa: { connect: { id: derechoId } },
        },
      }),
    ).rejects.toThrow(/Evidencia_guia_propietario_chk/);
  });

  it('la institución con evidencias no se puede borrar (ON DELETE RESTRICT)', async () => {
    await expect(ctx.prisma.institucion.delete({ where: { id: institucionId } })).rejects.toThrow();
    expect(await ctx.prisma.institucion.count({ where: { id: institucionId } })).toBe(1);
  });

  it('un programa no acepta un trámite institucional (400)', async () => {
    await request(servidor())
      .patch(`/api/v1/programas/${derechoId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tipoTramiteActivo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales })
      .expect(400);
  });
});
