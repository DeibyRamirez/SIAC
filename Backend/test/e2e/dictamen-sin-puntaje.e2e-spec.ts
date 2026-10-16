import { CodigoDocumentoGuia, RolUsuario, TipoTramiteSIAC } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import {
  ContextoE2E,
  crearAppE2E,
  iniciarSesion,
  limpiarDatosNegocio,
} from '../utilidades/app-e2e';
import { CorreoMemoriaProveedor } from '../utilidades/correo-memoria';
import { CODIGOS_CONDICION_INSTITUCIONAL } from '../../src/dominio/condiciones-institucionales';
import { ProcesadorNotificacionesSalidaService } from '../../src/notificaciones/procesador-notificaciones-salida.service';
import {
  asignarPrograma,
  crearEvidencia,
  crearPrograma,
  crearUsuarioE2E,
  idInstitucion,
} from '../utilidades/datos-e2e';
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
 * T-006.2 (HU-006): G2 y G4 no se puntúan (decisión del PO, 06/10).
 * Ciclo completo: ConObservaciones → nueva versión → EnRevision → Validado.
 * Además verifica CA2 (1 alerta in-app + 1 correo con las observaciones escapadas).
 */
describe('Dictamen sin puntaje G2/G4 (T-006.2)', () => {
  let ctx: ContextoE2E;
  let correo: CorreoMemoriaProveedor;
  let tokenCargador: string;
  let tokenRevisor: string;
  let tokenResponsable: string;
  let tokenRevisorInstitucional: string;
  let cargadorId: string;
  let revisorId: string;
  let cargadorCorreo: string;
  let responsableId: string;
  let institucionId: string;
  let tipoTramiteOriginal: TipoTramiteSIAC;

  const servidor = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    correo = new CorreoMemoriaProveedor();
    ctx = await crearAppE2E({ correoMemoria: correo });
    await limpiarDatosNegocio(ctx.prisma);

    const cargador = await iniciarSesion(ctx.app, 'Cargador');
    tokenCargador = cargador.token;
    cargadorId = cargador.usuarioId;
    cargadorCorreo = (
      await ctx.prisma.usuario.findUniqueOrThrow({ where: { id: cargadorId } })
    ).correo;
    const revisor = await iniciarSesion(ctx.app, 'Revisor');
    tokenRevisor = revisor.token;
    revisorId = revisor.usuarioId;

    // Responsable institucional G3/G4 (usuario sintético con la marca habilitada).
    const responsable = await crearUsuarioE2E(ctx.prisma, {
      alias: 'responsable-inst',
      rol: RolUsuario.Cargador,
      contrasena: 'Responsable2026',
    });
    responsableId = responsable.id;
    await ctx.prisma.usuario.update({
      where: { id: responsable.id },
      data: { responsableProcesoInstitucional: true },
    });
    const revisorInstitucional = await crearUsuarioE2E(ctx.prisma, {
      alias: 'revisor-inst',
      rol: RolUsuario.Revisor,
      contrasena: 'RevisorInst2026',
    });
    await ctx.prisma.usuario.update({
      where: { id: revisorInstitucional.id },
      data: { responsableProcesoInstitucional: true },
    });

    // Mismo JWT que emite /auth/login (los sintéticos no usan el dominio institucional).
    const jwt = ctx.app.get(JwtService);
    tokenResponsable = jwt.sign({
      sub: responsable.id,
      correo: responsable.correo,
      rol: responsable.rol,
    });
    tokenRevisorInstitucional = jwt.sign({
      sub: revisorInstitucional.id,
      correo: revisorInstitucional.correo,
      rol: revisorInstitucional.rol,
    });

    // G4 vive en el trámite institucional de renovación.
    institucionId = await idInstitucion(ctx.prisma);
    const institucion = await ctx.prisma.institucion.findFirstOrThrow();
    tipoTramiteOriginal = institucion.tipoTramiteActivo;
    await ctx.prisma.institucion.update({
      where: { id: institucionId },
      data: { tipoTramiteActivo: TipoTramiteSIAC.RenovacionCondicionesInstitucionales },
    });
  });

  afterAll(async () => {
    if (ctx) {
      if (tipoTramiteOriginal) {
        await ctx.prisma.institucion
          .update({
            where: { id: institucionId },
            data: { tipoTramiteActivo: tipoTramiteOriginal },
          })
          .catch(() => undefined);
      }
      await limpiarDatosNegocio(ctx.prisma);
      await ctx.app.close();
    }
  });

  function subirEvidencia(
    token: string,
    dto: { nombre: string; codigoGuia: 'G1' | 'G2' | 'G3' | 'G4'; programaId?: string },
    archivoNombre: string,
    archivo: Buffer,
  ) {
    const peticion = request(servidor())
      .post('/api/v1/evidencias')
      .set('Authorization', `Bearer ${token}`)
      .field('nombre', dto.nombre)
      .field('periodo', '2026-2')
      .field('codigoGuia', dto.codigoGuia);
    if (dto.programaId) peticion.field('programaId', dto.programaId);
    return peticion.attach('archivo', archivo, {
      filename: archivoNombre,
      contentType: MIME_DOCX,
    });
  }

  it('G2: ciclo ConObservaciones → nueva versión → EnRevision → Validado, con alerta y correo escapado', async () => {
    const programaId = (
      await crearPrograma(ctx.prisma, {
        nombre: 'Renovación Derecho',
        slug: 'renovacion-derecho',
        tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
      })
    ).id;
    await asignarPrograma(ctx.prisma, cargadorId, programaId);
    await asignarPrograma(ctx.prisma, revisorId, programaId);

    // G1 9/9 habilita la carga del G2.
    const { body: g1 } = await subirEvidencia(
      tokenCargador,
      { nombre: 'G1 Derecho', codigoGuia: 'G1', programaId },
      'g1.docx',
      await crearDocxE2E('G1 Derecho'),
    ).expect(201);
    await request(servidor())
      .post(`/api/v1/evidencias/${g1.id}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(201);
    await request(servidor())
      .post(`/api/v1/evidencias/${g1.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ condiciones: CONDICIONES_G1.map((codigo) => ({ codigo, cumple: true })) })
      .expect(201);

    const { body: g2 } = await subirEvidencia(
      tokenCargador,
      { nombre: 'G2 Respaldo mejoramiento', codigoGuia: 'G2', programaId },
      'g2.docx',
      await crearDocxE2E('G2 Respaldo mejoramiento'),
    ).expect(201);
    await request(servidor())
      .post(`/api/v1/evidencias/${g2.id}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(201);

    // G2 no se evalúa por condiciones.
    await request(servidor())
      .post(`/api/v1/evidencias/${g2.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({
        condiciones: CONDICIONES_G1.map((codigo) => ({ codigo, cumple: true })),
      })
      .expect(400);

    const observacionConHtml = 'Falta el plan de mejoramiento <script>alert(1)</script>';
    const { body: conObservaciones } = await request(servidor())
      .post(`/api/v1/evidencias/${g2.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ estado: 'ConObservaciones', observaciones: observacionConHtml })
      .expect(201);
    expect(conObservaciones.estado).toBe('ConObservaciones');
    expect(conObservaciones.puntajeActual).toBeNull();

    // CA2: 1 alerta in-app para el autor con metadata.evidenciaId.
    const alerta = await ctx.prisma.alertaInApp.findFirst({
      where: { usuarioId: cargadorId, tipo: 'dictamen_con_observaciones' },
    });
    expect(alerta?.metadata).toMatchObject({ evidenciaId: g2.id });

    // CA2: 1 fila de outbox y, al procesarla (T-007.3d, ya no se envía dentro de la petición),
    // 1 correo al autor con las observaciones escapadas y el enlace a la evidencia.
    const pendientes = await ctx.prisma.notificacionSalida.findMany({
      where: { tipo: 'dictamen_con_observaciones' },
    });
    expect(pendientes).toHaveLength(1);
    await ctx.app.get(ProcesadorNotificacionesSalidaService).procesarPendientes();
    const correosConObservaciones = correo.mensajes.filter(
      (mensaje) => mensaje.asunto === '[SIAC] Evidencia con observaciones',
    );
    expect(correosConObservaciones).toHaveLength(1);
    const mensajeCorreo = correosConObservaciones[0];
    expect(mensajeCorreo.destinatario).toBe(cargadorCorreo);
    expect(mensajeCorreo.textoHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mensajeCorreo.textoHtml).not.toContain('<script>');
    expect(mensajeCorreo.textoHtml).toContain(`/cargador/evidencias/${g2.id}`);

    // Nueva versión y reenvío.
    await request(servidor())
      .patch(`/api/v1/evidencias/${g2.id}/archivo`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .attach('archivo', await crearDocxE2E('G2 corregido'), {
        filename: 'g2.docx',
        contentType: MIME_DOCX,
      })
      .expect(200);
    await request(servidor())
      .post(`/api/v1/evidencias/${g2.id}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(201);

    const { body: enRevision } = await request(servidor())
      .get(`/api/v1/evidencias/${g2.id}`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(200);
    expect(enRevision.estado).toBe('EnRevision');
    expect(enRevision.version).toBe(2);

    const { body: validado } = await request(servidor())
      .post(`/api/v1/evidencias/${g2.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisor}`)
      .send({ estado: 'Validado' })
      .expect(201);
    expect(validado.estado).toBe('Validado');
    expect(validado.puntajeActual).toBeNull();

    const { body: historial } = await request(servidor())
      .get(`/api/v1/evidencias/${g2.id}/historial`)
      .set('Authorization', `Bearer ${tokenCargador}`)
      .expect(200);
    const estadosHistorial = (historial as { estado: string }[]).map((h) => h.estado);
    expect(estadosHistorial).toContain('ConObservaciones');
    expect(estadosHistorial).toContain('Validado');
    expect(estadosHistorial.filter((estado) => estado === 'EnRevision').length).toBeGreaterThanOrEqual(2);
  });

  it('G4: ciclo institucional sin puntaje con Validado final', async () => {
    // G3 aprobado (6/6) habilita la carga del G4.
    await crearEvidencia(ctx.prisma, {
      nombre: 'G3 Institucional aprobado',
      autorId: responsableId,
      institucionId,
      codigoGuia: CodigoDocumentoGuia.G3,
      estado: 'Cumple',
      puntaje: 6,
      total: 6,
    });

    const { body: g4 } = await subirEvidencia(
      tokenResponsable,
      { nombre: 'G4 Mejoramiento institucional', codigoGuia: 'G4' },
      'g4.docx',
      await crearDocxE2E('G4 Mejoramiento institucional'),
    ).expect(201);
    await request(servidor())
      .post(`/api/v1/evidencias/${g4.id}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenResponsable}`)
      .expect(201);

    // G4 no se evalúa por condiciones.
    await request(servidor())
      .post(`/api/v1/evidencias/${g4.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisorInstitucional}`)
      .send({
        condicionesInstitucionales: CODIGOS_CONDICION_INSTITUCIONAL.map((codigo) => ({
          codigo,
          cumple: true,
        })),
      })
      .expect(400);

    // «Con observaciones» exige texto de corrección.
    await request(servidor())
      .post(`/api/v1/evidencias/${g4.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisorInstitucional}`)
      .send({ estado: 'ConObservaciones' })
      .expect(400);

    const { body: conObservaciones } = await request(servidor())
      .post(`/api/v1/evidencias/${g4.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisorInstitucional}`)
      .send({ estado: 'ConObservaciones', observaciones: 'Falta el plan institucional 2026.' })
      .expect(201);
    expect(conObservaciones.estado).toBe('ConObservaciones');
    expect(conObservaciones.puntajeActual).toBeNull();

    await request(servidor())
      .patch(`/api/v1/evidencias/${g4.id}/archivo`)
      .set('Authorization', `Bearer ${tokenResponsable}`)
      .attach('archivo', await crearDocxE2E('G4 corregido'), {
        filename: 'g4.docx',
        contentType: MIME_DOCX,
      })
      .expect(200);
    await request(servidor())
      .post(`/api/v1/evidencias/${g4.id}/enviar-revision`)
      .set('Authorization', `Bearer ${tokenResponsable}`)
      .expect(201);

    const { body: validado } = await request(servidor())
      .post(`/api/v1/evidencias/${g4.id}/dictamen`)
      .set('Authorization', `Bearer ${tokenRevisorInstitucional}`)
      .send({ estado: 'Validado' })
      .expect(201);
    expect(validado.estado).toBe('Validado');
    expect(validado.puntajeActual).toBeNull();
  });
});
