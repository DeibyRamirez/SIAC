import {
  plantillaAnexoVenceManana,
  plantillaAvanceUmbral,
  plantillaDictamen,
  plantillaRevisionPendiente,
  plantillaVigencia,
  anioInicioVentanaRenovacion,
  rutaVigenciasPorRol,
} from './index';

/** Base fija para que los snapshots no dependan del entorno de quien corre Jest. */
process.env.SIAC_URL_FRONTEND = 'https://siac.test';

const DATOS_VIGENCIA = {
  nombreEntidad: 'Derecho',
  aniosVigencia: 7,
  mesesAvisoVigencia: 12,
  mesesRojoVigencia: 6,
  fechaFinIso: '2027-01-01T00:00:00.000Z',
  fechaResolucionIso: '2020-01-01T00:00:00.000Z',
  programaId: 'prog-1',
};

describe('plantillas de correo (T-007.3h, C-5)', () => {
  it('vigencia_amarilla', () => {
    const plantilla = plantillaVigencia('amarillo', DATOS_VIGENCIA);
    expect(plantilla.asunto).toBe('[SIAC] Derecho: inicio de ventana de renovación');
    expect(plantilla.texto).toContain('año 7 de 7');
    expect(plantilla.texto).toContain('Resolución MEN: 2020-01-01');
    expect(plantilla).toMatchSnapshot();
  });

  it('vigencia_roja', () => {
    const plantilla = plantillaVigencia('rojo', DATOS_VIGENCIA);
    expect(plantilla.asunto).toBe('[SIAC] Derecho: vigencia en ventana roja');
    expect(plantilla).toMatchSnapshot();
  });

  it('vigencia_vencida', () => {
    const plantilla = plantillaVigencia('vencido', DATOS_VIGENCIA);
    expect(plantilla.asunto).toBe('[SIAC] Derecho: vigencia de registro vencida');
    expect(plantilla).toMatchSnapshot();
  });

  it('vigencia en demo: [PRUEBA] en el asunto, fecha simulada y sin fecha de fin contradictoria', () => {
    const plantilla = plantillaVigencia('vencido', {
      ...DATOS_VIGENCIA,
      fechaSimuladaIso: '2027-01-01T00:00:00.000Z',
    });
    expect(plantilla.asunto).toBe('[PRUEBA] [SIAC] Derecho: vigencia de registro vencida');
    expect(plantilla.texto).toContain('fecha simulada 2027-01-01');
    expect(plantilla.texto).not.toMatch(/ha superado/);
    expect(plantilla.html).toContain('Vigencia · PRUEBA');
  });

  it('año de inicio de la ventana amarilla según umbrales', () => {
    expect(anioInicioVentanaRenovacion(7, 12)).toBe(7);
    expect(anioInicioVentanaRenovacion(7, 24)).toBe(6);
    expect(anioInicioVentanaRenovacion(5, 18)).toBe(4);
  });

  it('enlace por rol: Revisor a su resumen, institucional con institucionId (fix J)', () => {
    expect(plantillaVigencia('rojo', { ...DATOS_VIGENCIA, rolDestinatario: 'Revisor' }).texto).toContain(
      'https://siac.test/revisor',
    );
    expect(plantillaVigencia('rojo', { ...DATOS_VIGENCIA, rolDestinatario: 'Administrador' }).texto).toContain(
      'https://siac.test/administrador/vigencias?programaId=prog-1',
    );
    expect(rutaVigenciasPorRol('SuperAdmin', { institucionId: 'inst-cuac' })).toBe(
      '/administrador/programas/institucion?institucionId=inst-cuac',
    );
  });

  it('anexo_vence_manana', () => {
    const plantilla = plantillaAnexoVenceManana({
      titulo: 'Certificado RETIE',
      responsable: 'admin.planeacion@uniautonoma.edu.co',
      fechaVencimientoIso: '2026-10-17T00:00:00.000Z',
      programaId: 'prog-1',
      anexoId: 'anx-1',
    });
    expect(plantilla.asunto).toBe('[SIAC] Certificado vence mañana');
    expect(plantilla).toMatchSnapshot();
  });

  it('revision_pendiente', () => {
    const plantilla = plantillaRevisionPendiente({
      nombreEvidencia: 'G1 Derecho',
      evidenciaId: 'ev-1',
      programaId: 'prog-1',
    });
    expect(plantilla.asunto).toBe('[SIAC] Evidencia pendiente de revisión');
    expect(plantilla).toMatchSnapshot();
  });

  it('avance_umbral', () => {
    const plantilla = plantillaAvanceUmbral({
      nombrePrograma: 'Derecho',
      avance: 55.6,
      umbral: 'amarillo',
      minimo: 55,
      programaId: 'prog-1',
    });
    expect(plantilla.asunto).toBe('[SIAC] Avance de programa');
    expect(plantilla).toMatchSnapshot();
  });

  it('dictamen_validado', () => {
    const plantilla = plantillaDictamen({
      tipo: 'dictamen_validado',
      mensaje: 'Tu evidencia "G1 Derecho" quedó Validada.',
      evidenciaId: 'ev-1',
    });
    expect(plantilla.asunto).toBe('[SIAC] Evidencia validada');
    expect(plantilla).toMatchSnapshot();
  });

  it('dictamen_cumple', () => {
    const plantilla = plantillaDictamen({
      tipo: 'dictamen_cumple',
      mensaje: 'Tu evidencia "G1 Derecho" cumple todas las condiciones (9/9).',
      evidenciaId: 'ev-1',
    });
    expect(plantilla).toMatchSnapshot();
  });

  it('dictamen_con_observaciones', () => {
    const plantilla = plantillaDictamen({
      tipo: 'dictamen_con_observaciones',
      mensaje: 'Tu evidencia "G1 <script>alert(1)</script>" quedó con observaciones.',
      evidenciaId: 'ev-1',
    });
    // HTML escapado (T-006.3): el texto del usuario nunca se inyecta crudo.
    expect(plantilla.html).not.toContain('<script>');
    expect(plantilla.texto).toContain('<script>');
    expect(plantilla).toMatchSnapshot();
  });
});
