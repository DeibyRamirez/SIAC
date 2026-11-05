import { TipoTramiteSIAC } from '@prisma/client';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { asignarPrograma, crearPrograma } from '../utilidades/datos-e2e';
import {
  LIMITE_DOCX_BYTES,
  MIME_DOCX,
  crearDocxE2EConTamanoBytes,
} from '../utilidades/docx-e2e';

/** CP-F05-LIM: valores límite de tamaño en POST /evidencias (RN tamaño máximo 20 MB). */
describe('Tamaño máximo de evidencia .docx (E2E)', () => {
  let ctx: ContextoE2E;
  let tokenCargador: string;
  let programaId: string;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);
    const sesion = await iniciarSesion(ctx.app, 'Cargador');
    tokenCargador = sesion.token;
    programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Ingeniería límite',
        slug: 'ing-limite',
        tipoTramiteActivo: TipoTramiteSIAC.RegistroCalificadoNuevo,
      })
    ).id;
    await asignarPrograma(ctx.prisma, sesion.usuarioId, programaId);
  }, 120_000);

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function subir(buffer: Buffer) {
    return request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', 'Documento límite tamaño')
      .field('programaId', programaId)
      .field('periodo', '2099-1')
      .field('codigoGuia', 'G1')
      .attach('archivo', buffer, {
        filename: 'limite.docx',
        contentType: MIME_DOCX,
      });
  }

  it('acepta un .docx de exactamente 20 MB', async () => {
    const buffer = await crearDocxE2EConTamanoBytes(LIMITE_DOCX_BYTES);
    expect(buffer.length).toBe(LIMITE_DOCX_BYTES);
    const respuesta = await subir(buffer);
    expect(respuesta.status).toBe(201);
  }, 120_000);

  it('rechaza un .docx de 20 MB + 1 byte con HTTP 400', async () => {
    const buffer = await crearDocxE2EConTamanoBytes(LIMITE_DOCX_BYTES + 1);
    expect(buffer.length).toBe(LIMITE_DOCX_BYTES + 1);
    const respuesta = await subir(buffer);
    expect(respuesta.status).toBe(400);
    expect(String(respuesta.body.message ?? respuesta.text)).toMatch(/20 MB/);
  }, 120_000);
});
