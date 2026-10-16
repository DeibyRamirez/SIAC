import {
  EnlaceCta,
  envolverHtml,
  parrafoHtml,
  PlantillaCorreo,
  textoCtaPlano,
  urlFrontend,
} from './comun';

export interface DatosRevisionCorreo {
  nombreEvidencia: string;
  evidenciaId: string;
  programaId?: string | null;
}

function enlaceRevision(datos: DatosRevisionCorreo): EnlaceCta {
  return {
    href: `${urlFrontend()}/revisor/bandeja/${datos.evidenciaId}`,
    texto: 'Revisar evidencia',
  };
}

/** HU-006: una evidencia quedó pendiente de revisión. */
export function plantillaRevisionPendiente(datos: DatosRevisionCorreo): PlantillaCorreo {
  const mensaje = `Nueva evidencia en revisión: "${datos.nombreEvidencia}".`;
  return {
    asunto: '[SIAC] Evidencia pendiente de revisión',
    texto: `${mensaje}${textoCtaPlano(enlaceRevision(datos))}`,
    html: envolverHtml({
      etiqueta: 'Revisión pendiente',
      titulo: 'Evidencia pendiente de revisión',
      cuerpoHtml: parrafoHtml(mensaje),
      enlace: enlaceRevision(datos),
    }),
  };
}
