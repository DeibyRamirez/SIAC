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

/** Rol del destinatario: decide el enlace profundo (fix J). */
export type RolDestinatarioVigencia = 'Administrador' | 'SuperAdmin' | 'Revisor' | 'Cargador';

export interface DatosVigenciaCorreo {
  nombreEntidad: string;
  aniosVigencia: number;
  mesesAvisoVigencia: number;
  mesesRojoVigencia: number;
  /** Fin de vigencia en ISO (calculado con los umbrales de BD). */
  fechaFinIso: string;
  /** Fecha de la resolución MEN en ISO (fix H). */
  fechaResolucionIso?: string;
  /** Demo acelerada (fix H): fecha simulada del semáforo; marca el correo como [PRUEBA]. */
  fechaSimuladaIso?: string;
  programaId?: string;
  institucionId?: string;
  /** Rol del destinatario; sin rol se usa el enlace de Administrador. */
  rolDestinatario?: RolDestinatarioVigencia;
}

/**
 * Ruta de la vista de vigencias según el rol (fix J). El Revisor no tiene acceso a
 * /administrador/*, así que va a su resumen; el alcance institucional abre el proceso institucional.
 */
export function rutaVigenciasPorRol(
  rol: RolDestinatarioVigencia | undefined,
  ids: { programaId?: string; institucionId?: string },
): string {
  if (rol === 'Revisor' || rol === 'Cargador') return rol === 'Revisor' ? '/revisor' : '/cargador';
  if (ids.institucionId) {
    return `/administrador/programas/institucion?institucionId=${encodeURIComponent(ids.institucionId)}`;
  }
  return ids.programaId
    ? `/administrador/vigencias?programaId=${encodeURIComponent(ids.programaId)}`
    : '/administrador/vigencias';
}

function enlaceVigencias(datos: DatosVigenciaCorreo): EnlaceCta {
  return {
    href: `${urlFrontend()}${rutaVigenciasPorRol(datos.rolDestinatario, datos)}`,
    texto: datos.rolDestinatario === 'Revisor' ? 'Abrir SIAC' : 'Ver vigencias en SIAC',
  };
}

/**
 * Año de vigencia en que empieza la ventana amarilla (fix I): con 7 años y aviso de 12 meses es
 * el año 7; con aviso de 24 meses, el año 6.
 */
export function anioInicioVentanaRenovacion(aniosVigencia: number, mesesAvisoVigencia: number): number {
  const mesesHastaAmarillo = Math.max(0, aniosVigencia * 12 - mesesAvisoVigencia);
  return Math.min(aniosVigencia, Math.floor(mesesHastaAmarillo / 12) + 1);
}

function textoFechas(datos: DatosVigenciaCorreo): string {
  const partes: string[] = [];
  if (datos.fechaResolucionIso) partes.push(`Resolución MEN: ${fechaCorta(datos.fechaResolucionIso)}`);
  partes.push(`fin de vigencia: ${fechaCorta(datos.fechaFinIso)}`);
  return `${partes.join('; ')}.`;
}

function textoPrueba(datos: DatosVigenciaCorreo): string {
  return datos.fechaSimuladaIso
    ? ` [PRUEBA] Simulación acelerada de vigencia: fecha simulada ${fechaCorta(datos.fechaSimuladaIso)}; no es una alerta real.`
    : '';
}

export function mensajeVigencia(
  datos: DatosVigenciaCorreo,
  umbral: UmbralVigenciaCorreo,
): string {
  const fin = fechaCorta(datos.fechaFinIso);
  let base: string;
  if (umbral === 'amarillo') {
    const anio = anioInicioVentanaRenovacion(datos.aniosVigencia, datos.mesesAvisoVigencia);
    base = `La vigencia de registro de ${datos.nombreEntidad} entró en ventana de renovación (año ${anio} de ${datos.aniosVigencia}; amarillo desde ${datos.mesesAvisoVigencia} meses antes del fin, ${fin}). Inicie el proceso SIAC de renovación cuando corresponda.`;
  } else if (umbral === 'rojo') {
    base = `La vigencia de registro de ${datos.nombreEntidad} entró en ventana roja (${datos.mesesRojoVigencia} meses antes del fin, ${fin}). El proceso SIAC de renovación debe continuar a tiempo.`;
  } else {
    base = datos.fechaSimuladaIso
      ? `La vigencia de registro de ${datos.nombreEntidad} llegó al fin de los ${datos.aniosVigencia} años en la simulación. Inicie el proceso de renovación.`
      : `La vigencia de registro de ${datos.nombreEntidad} ha superado los ${datos.aniosVigencia} años (fin ${fin}). Inicie el proceso de renovación.`;
  }
  return `${base} ${textoFechas(datos)}${textoPrueba(datos)}`;
}

/** Asunto con la entidad (fix G) y prefijo [PRUEBA] en la demo acelerada (fix H). */
export function asuntoVigencia(umbral: UmbralVigenciaCorreo, datos: DatosVigenciaCorreo): string {
  const evento =
    umbral === 'amarillo'
      ? 'inicio de ventana de renovación'
      : umbral === 'rojo'
        ? 'vigencia en ventana roja'
        : 'vigencia de registro vencida';
  const prefijo = datos.fechaSimuladaIso ? '[PRUEBA] ' : '';
  return `${prefijo}[SIAC] ${datos.nombreEntidad}: ${evento}`;
}

/**
 * Recordatorio de vigencia (T-007.3h): «los avisos son recordatorios para que el proceso SIAC
 * continúe a tiempo», a Administrador/SuperAdmin y Revisores activos del programa.
 */
export function plantillaVigencia(
  umbral: UmbralVigenciaCorreo,
  datos: DatosVigenciaCorreo,
): PlantillaCorreo {
  return {
    asunto: asuntoVigencia(umbral, datos),
    texto: `${mensajeVigencia(datos, umbral)}${textoCtaPlano(enlaceVigencias(datos))}`,
    html: armarHtml(umbral, datos),
  };
}

function armarHtml(umbral: UmbralVigenciaCorreo, datos: DatosVigenciaCorreo): string {
  const titulo =
    umbral === 'amarillo'
      ? 'Ventana de renovación abierta'
      : umbral === 'rojo'
        ? 'Vigencia en ventana roja'
        : 'Vigencia de registro vencida';
  return envolverHtml({
    etiqueta: datos.fechaSimuladaIso ? 'Vigencia · PRUEBA' : 'Vigencia',
    titulo: `${titulo}: ${datos.nombreEntidad}`,
    cuerpoHtml: parrafoHtml(mensajeVigencia(datos, umbral)),
    enlace: enlaceVigencias(datos),
    nota: 'Recordatorio de vigencia del SIAC para que el proceso de renovación continúe a tiempo.',
  });
}
