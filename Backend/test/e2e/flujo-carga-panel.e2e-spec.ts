import { RolUsuario, TipoTramiteSIAC } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import {
  ContextoE2E,
  USUARIOS_SEMILLA,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { asignarPrograma, crearPrograma, crearUsuarioE2E } from '../utilidades/datos-e2e';
import { MIME_DOCX, crearDocxE2E } from '../utilidades/docx-e2e';

const CONDICIONES_G1 = [
  'Denominacion',
  'Justificacion',
  'AspectosCurriculares',
  'OrganizacionActividades',
  'InvestigacionInnovacion',
  'RelacionSectorExterno',
  'Profesores',
  'MediosEducativos',
  'Infraestructura',
] as const;

/**
 * R-010.4 (T-010.4): flujo completo Cargador → Revisor → panel del Administrador.
 * Casos CP-E2E-01 a CP-E2E-05, documentados en docs/etapa-3/README.md.
 */
describe('Flujo de carga y panel (CP-E2E-01 a CP-E2E-05)', () => {
  let ctx: ContextoE2E;
  let tokenCargador: string;
  let tokenRevisor: string;
  let tokenAdmin: string;
  let tokenRevisorAjeno: string;
  let derechoId: string;
  let evidenciaG1Id: string;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await crearAppE2E();
    await limpiarDatosNegocio(ctx.prisma);

    const cargador = await iniciarSesion(ctx.app, 'Cargador');
    const revisor = await iniciarSesion(ctx.app, 'Revisor');
    tokenCargador = cargador.token;
    tokenRevisor = revisor.token;
    tokenAdmin = (await iniciarSesion(ctx.app, 'Administrador')).token;

    // Programa nuevo: G1 pesa 100 %, así 5/9 = 55,56 % cae en amarillo con los umbrales por defecto (55/100).
    derechoId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Derecho',
        slug: 'derecho',
        tipoTramiteActivo: TipoTramiteSIAC.RegistroCalificadoNuevo,
      })
    ).id;
    const medicinaId = (await crearPrograma(ctx.prisma, { nombre: 'Medicina', slug: 'medicina' })).id;
    await asignarPrograma(ctx.prisma, cargador.usuarioId, derechoId);
    await asignarPrograma(ctx.prisma, revisor.usuarioId, derechoId);

    const ajeno = await crearUsuarioE2E(ctx.prisma, { alias: 'revisor-medicina', rol: RolUsuario.Revisor, contrasena: 'RevisorAjeno2026' });
    await asignarPrograma(ctx.prisma, ajeno.id, medicinaId);
    // El login exige el dominio institucional; para el usuario sintético se firma el mismo JWT que emite /auth/login.
    tokenRevisorAjeno = ctx.app.get(JwtService).sign({ sub: ajeno.id, correo: ajeno.correo, rol: ajeno.rol });
  });

  afterAll(async () => {
    if (ctx) {
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function subirG1(nombreArchivo: string, buffer: Buffer, tipo = MIME_DOCX) {
    return request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${tokenCargador}`)
      .field('nombre', 'Documento maestro Derecho')
      .field('programaId', derechoId)
      .field('periodo', '2026-2')
      .field('codigoGuia', 'G1')
      .attach('archivo', buffer, { filename: nombreArchivo, contentType: tipo });
  }

  it('CP-E2E-01: Cargador sube un .docx de Derecho, el Revisor da 5/9 y el Admin ve 5/9, «Con observaciones» y amarillo', async () => {
    const { body: creada } = await subirG1('Documento maestro Derecho.docx', await crearDocxE2E('Documento maestro')).expect(201);
    evidenciaG1Id = creada.id;
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaG1Id}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(201);

    const condiciones = CONDICIONES_G1.map((codigo, i) => ({
      codigo,
      cumple: i < 5,
      ...(i < 5 ? {} : { observacion: `Falta soporte de ${codigo}` }),
    }));
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaG1Id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ condiciones, observaciones: 'Completar las condiciones 6 a 9.' })
      .expect(201);

    const { body: evidencia } = await request(servidor())
      .get(`/api/v1/evidencias/${evidenciaG1Id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(evidencia.estado).toBe('ConObservaciones');

    const { body: panel } = await request(servidor())
      .get('/api/v1/programas/panel')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const fila = panel.datos.find((f: { id: string }) => f.id === derechoId);
    const g1 = fila.documentos.find((d: { codigoGuia: string }) => d.codigoGuia === 'G1');
    expect(`${g1.puntaje}/${g1.totalCondiciones}`).toBe('5/9');
    expect(fila.avancePorcentual).toBeCloseTo(55.56, 2);
    expect(fila.semaforoAvance).toBe('Amarillo');
  });

  it('CP-E2E-02: un PDF renombrado a .docx se rechaza con 400', async () => {
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const { body } = await subirG1('documento-maestro.docx', pdf).expect(400);
    expect(JSON.stringify(body)).toMatch(/docx|Word/i);
  });

  it('CP-E2E-03: un Revisor de otro programa no puede dictaminar la evidencia de Derecho (403)', async () => {
    await request(servidor())
      .post(`/api/v1/evidencias/${evidenciaG1Id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisorAjeno}`)
      .send({ condiciones: CONDICIONES_G1.map((codigo) => ({ codigo, cumple: true })) })
      .expect(403);
  });

  it('CP-E2E-04: el Administrador no ve un borrador nunca enviado', async () => {
    const { body: borrador } = await subirG1('Borrador Derecho.docx', await crearDocxE2E('Borrador')).expect(201);

    const { body: lista } = await request(servidor())
      .get(`/api/v1/evidencias?programaId=${derechoId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const ids = (lista.datos ?? lista).map((e: { id: string }) => e.id);
    expect(ids).toContain(evidenciaG1Id);
    expect(ids).not.toContain(borrador.id);

    const detalle = await request(servidor())
      .get(`/api/v1/evidencias/${borrador.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect([403, 404]).toContain(detalle.status);
  });

  it('CP-E2E-05: un anexo de infraestructura vencido pone semaforoGeneral=Rojo', async () => {
    await request(servidor())
      .post('/api/v1/vigencias/con-archivo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .field('titulo', 'Certificado de bomberos — Sede Norte')
      .field('programaId', derechoId)
      .field('categoria', 'Infraestructura')
      .field('evidenciaId', evidenciaG1Id)
      .field('fechaVencimiento', '2026-09-01')
      .field('responsable', USUARIOS_SEMILLA.Administrador.correo)
      .attach('archivo', Buffer.from('%PDF-1.4 certificado'), {
        filename: 'Certificado de bomberos — Sede Norte.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const { body: panel } = await request(servidor())
      .get('/api/v1/programas/panel')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    const fila = panel.datos.find((f: { id: string }) => f.id === derechoId);
    expect(fila.anexoInfraestructuraVencido).toBe(true);
    expect(fila.semaforoGeneral).toBe('Rojo');
  });
});
