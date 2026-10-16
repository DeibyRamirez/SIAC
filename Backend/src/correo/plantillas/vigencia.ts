import {
  EnlaceCta,
  envolverHtml,
  fechaCorta,
  parrafoHtml,
  PlantillaCorreo,
  textoCtaPlano,
  urlFrontend,
} from './comun';

export type UmbralVigenciaCorreo = 'amarillo' | 'rojo' | 'vencido';

export interface DatosVigenciaCorreo {
  nombreEntidad: string;
  aniosVigencia: number;
  mesesAvisoVigencia: number;
  mesesRojoVigencia: number;
  /** Fin de vigencia en ISO (calculado con los umbrales de BD). */
  fechaFinIso: string;
  programaId?: string;
  institucionId?: string;
}

function enlaceVigencias(datos: DatosVigenciaCorreo): EnlaceCta {
  const base = `${urlFrontend()}/administrador/vigencias`;
  return {
    href: datos.programaId ? `${base}?programaId=${datos.programaId}` : base,
    texto: 'Ver vigencias en SIAC',
  };
}

export function mensajeVigencia(
  datos: DatosVigenciaCorreo,
  umbral: UmbralVigenciaCorreo,
): string {
  const fin = fechaCorta(datos.fechaFinIso);
  if (umbral === 'amarillo') {
    return `La vigencia de registro de ${datos.nombreEntidad} entró en ventana de renovación (año 6 de ${datos.aniosVigencia}; amarillo desde ${datos.mesesAvisoVigencia} meses antes del fin, ${fin}). Inicie el proceso SIAC de renovación cuando corresponda.`;
  }
  if (umbral === 'rojo') {
    return `La vigencia de registro de ${datos.nombreEntidad} entró en ventana roja (${datos.mesesRojoVigencia} meses antes del fin, ${fin}). El proceso SIAC de renovación debe continuar a tiempo.`;
  }
  return `La vigencia de registro de ${datos.nombreEntidad} ha superado los ${datos.aniosVigencia} años (fin ${fin}). Inicie el proceso de renovación.`;
}

/**
 * Recordatorio de vigencia (T-007.3h): «los avisos son recordatorios para que el proceso SIAC
 * continúe a tiempo», a Administrador/SuperAdmin/Revisor activos.
 */
export function plantillaVigencia(
  umbral: UmbralVigenciaCorreo,
  datos: DatosVigenciaCorreo,
): PlantillaCorreo {
  const asunto =
    umbral === 'amarillo'
      ? '[SIAC] Inicio de ventana de renovación'
      : umbral === 'rojo'
        ? '[SIAC] Ventana roja de vigencia'
        : '[SIAC] Vigencia de registro vencida';
  return {
    asunto,
    texto: `${mensajeVigencia(datos, umbral)}${textoCtaPlano(enlaceVigencias(datos))}`,
    html: armarHtml(umbral, datos),
  };
}

function armarHtml(umbral: UmbralVigenciaCorreo, datos: DatosVigenciaCorreo): string {
  return envolverHtml({
    etiqueta: 'Vigencia',
    titulo:
      umbral === 'amarillo'
        ? 'Ventana de renovación abierta'
        : umbral === 'rojo'
          ? 'Vigencia en ventana roja'
          : 'Vigencia de registro vencida',
    cuerpoHtml: parrafoHtml(mensajeVigencia(datos, umbral)),
    enlace: enlaceVigencias(datos),
    nota: 'Recordatorio de vigencia del SIAC para que el proceso de renovación continúe a tiempo.',
  });
}
