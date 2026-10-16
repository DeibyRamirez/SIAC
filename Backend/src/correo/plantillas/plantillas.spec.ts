import {
  plantillaAnexoVenceManana,
  plantillaAvanceUmbral,
  plantillaDictamen,
  plantillaRevisionPendiente,
  plantillaVigencia,
} from './index';

/** Base fija para que los snapshots no dependan del entorno de quien corre Jest. */
process.env.SIAC_URL_FRONTEND = 'https://siac.test';

const DATOS_VIGENCIA = {
  nombreEntidad: 'Derecho',
  aniosVigencia: 7,
  mesesAvisoVigencia: 24,
  mesesRojoVigencia: 18,
  fechaFinIso: '2027-01-01T00:00:00.000Z',
  programaId: 'prog-1',
};

describe('plantillas de correo (T-007.3h, C-5)', () => {
  it('vigencia_amarilla', () => {
    const plantilla = plantillaVigencia('amarillo', DATOS_VIGENCIA);
    expect(plantilla.asunto).toBe('[SIAC] Inicio de ventana de renovación');
    expect(plantilla).toMatchSnapshot();
  });

  it('vigencia_roja', () => {
    const plantilla = plantillaVigencia('rojo', DATOS_VIGENCIA);
    expect(plantilla.asunto).toBe('[SIAC] Ventana roja de vigencia');
    expect(plantilla).toMatchSnapshot();
  });

  it('vigencia_vencida', () => {
    const plantilla = plantillaVigencia('vencido', DATOS_VIGENCIA);
    expect(plantilla.asunto).toBe('[SIAC] Vigencia de registro vencida');
    expect(plantilla).toMatchSnapshot();
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
