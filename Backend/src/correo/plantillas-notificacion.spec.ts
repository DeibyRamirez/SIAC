import { construirPlantillaCorreoNotificacion } from './plantillas-notificacion';

describe('construirPlantillaCorreoNotificacion', () => {
  it('incluye HTML con el mensaje y el tipo', () => {
    const plantilla = construirPlantillaCorreoNotificacion(
      'revision_pendiente',
      'Nueva evidencia en revisión.',
      '[SIAC] Evidencia pendiente de revisión',
      { evidenciaId: 'ev-1' },
    );
    expect(plantilla.asunto).toContain('SIAC');
    expect(plantilla.textoPlano).toContain('Nueva evidencia en revisión.');
    expect(plantilla.textoHtml).toContain('Revisión pendiente');
    expect(plantilla.textoHtml).toContain('Nueva evidencia en revisión.');
    expect(plantilla.textoHtml).toContain('/revisor/bandeja/ev-1');
  });
});
