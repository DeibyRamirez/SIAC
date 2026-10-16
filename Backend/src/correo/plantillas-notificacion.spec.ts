import {
  construirPlantillaCorreoNotificacion,
  escaparHtml,
} from './plantillas-notificacion';

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

  it('el dictamen enlaza al cargador a su evidencia', () => {
    const plantilla = construirPlantillaCorreoNotificacion(
      'dictamen_con_observaciones',
      'Tu evidencia "G1" quedó con observaciones.',
      undefined,
      { evidenciaId: 'ev-2' },
    );
    expect(plantilla.textoHtml).toContain('/cargador/evidencias/ev-2');
    expect(plantilla.textoHtml).toContain('Con observaciones');
    expect(plantilla.textoPlano).toContain('/cargador/evidencias/ev-2');
  });

  it.each([
    'dictamen_validado',
    'dictamen_cumple',
    'dictamen_con_observaciones',
  ])('el tipo %s tiene etiqueta propia', (tipo) => {
    const plantilla = construirPlantillaCorreoNotificacion(tipo, 'Mensaje', undefined, {
      evidenciaId: 'ev-3',
    });
    expect(plantilla.textoHtml).not.toContain('Notificación SIAC</span>');
    expect(plantilla.asunto.startsWith('[SIAC]')).toBe(true);
  });

  it('escapa el HTML de las observaciones y del nombre de la evidencia', () => {
    const plantilla = construirPlantillaCorreoNotificacion(
      'dictamen_con_observaciones',
      'Tu evidencia "<script>alert(1)</script>" quedó con observaciones: Falta <b>soporte</b> & anexos',
      undefined,
      { evidenciaId: 'ev-4' },
    );

    expect(plantilla.textoHtml).not.toContain('<script>');
    expect(plantilla.textoHtml).not.toContain('<b>soporte</b>');
    expect(plantilla.textoHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(plantilla.textoHtml).toContain('&lt;b&gt;soporte&lt;/b&gt;');
    expect(plantilla.textoHtml).toContain('&amp; anexos');
    // El texto plano conserva el original (no es HTML).
    expect(plantilla.textoPlano).toContain('<script>alert(1)</script>');
  });

  it('conserva los saltos de línea del mensaje en el HTML', () => {
    const plantilla = construirPlantillaCorreoNotificacion(
      'dictamen_con_observaciones',
      'Condición A: falta\nCondición B: falta',
      undefined,
      { evidenciaId: 'ev-5' },
    );
    expect(plantilla.textoHtml).toContain('Condición A: falta<br>Condición B: falta');
  });
});

describe('escaparHtml', () => {
  it('escapa los caracteres peligrosos', () => {
    expect(escaparHtml(`<a href="x" title='y'>&"</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&quot;&lt;/a&gt;',
    );
  });

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(escaparHtml('Observación sin etiquetas')).toBe('Observación sin etiquetas');
  });
});
