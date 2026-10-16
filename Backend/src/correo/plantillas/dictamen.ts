import {
  EnlaceCta,
  envolverHtml,
  parrafoHtml,
  PlantillaCorreo,
  textoCtaPlano,
  urlFrontend,
} from './comun';

export interface DatosDictamenCorreo {
  /** Tipo canónico del dictamen (HU-006): dictamen_validado/cumple/con_observaciones. */
  tipo: string;
  mensaje: string;
  evidenciaId: string;
}

/** Asuntos de correo por tipo de dictamen (HU-006, CA2). */
export const ASUNTOS_DICTAMEN: Record<string, string> = {
  dictamen_validado: '[SIAC] Evidencia validada',
  dictamen_cumple: '[SIAC] Evidencia cumple todas las condiciones',
  dictamen_con_observaciones: '[SIAC] Evidencia con observaciones',
};

const ETIQUETAS_DICTAMEN: Record<string, string> = {
  dictamen_validado: 'Aprobación',
  dictamen_cumple: 'Cumple',
  dictamen_con_observaciones: 'Con observaciones',
  aprobacion: 'Aprobación',
  observaciones: 'Con observaciones',
  rechazo: 'Con observaciones',
};

function enlaceEvidencia(datos: DatosDictamenCorreo): EnlaceCta {
  return {
    href: `${urlFrontend()}/cargador/evidencias/${datos.evidenciaId}`,
    texto: 'Ver mi evidencia',
  };
}

/** HU-006: dictamen del Revisor al Cargador autor. */
export function plantillaDictamen(datos: DatosDictamenCorreo): PlantillaCorreo {
  const enlace = enlaceEvidencia(datos);
  return {
    asunto: ASUNTOS_DICTAMEN[datos.tipo] ?? '[SIAC] Actualización de evidencia',
    texto: `${datos.mensaje}${textoCtaPlano(enlace)}`,
    html: envolverHtml({
      etiqueta: ETIQUETAS_DICTAMEN[datos.tipo] ?? 'Notificación SIAC',
      titulo: 'Resultado de la revisión',
      cuerpoHtml: parrafoHtml(datos.mensaje),
      enlace,
    }),
  };
}
