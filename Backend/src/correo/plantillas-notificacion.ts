import { plantillaGenerica } from './plantillas/generica';
import { escaparHtml } from './plantillas/comun';

export interface PlantillaCorreoNotificacion {
  asunto: string;
  textoPlano: string;
  textoHtml: string;
}

export { escaparHtml };

/**
 * Compatibilidad HU-006/HU-010: adapta la plantilla genérica pura (T-007.3h, que devuelve
 * `{asunto, texto, html}`) al contrato de `CorreoService` (`textoPlano`/`textoHtml`).
 * Las plantillas específicas (vigencia, anexo D-1, dictamen…) viven en `./plantillas`.
 */
export function construirPlantillaCorreoNotificacion(
  tipo: string,
  mensaje: string,
  asuntoCorreo?: string,
  metadata?: Record<string, unknown>,
): PlantillaCorreoNotificacion {
  const plantilla = plantillaGenerica(tipo, mensaje, asuntoCorreo, metadata);
  return {
    asunto: plantilla.asunto,
    textoPlano: plantilla.texto,
    textoHtml: plantilla.html,
  };
}
