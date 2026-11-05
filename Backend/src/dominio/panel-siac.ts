import { EstadoEvidencia } from '@prisma/client';
import { ColorSemaforo, colorMasCritico } from './puntaje-condiciones';

/** Estados con revisión del Revisor — excluye borradores y pendientes de revisión. */
export const ESTADOS_EVIDENCIA_REVISADOS: EstadoEvidencia[] = [
  EstadoEvidencia.Cumple,
  EstadoEvidencia.ConObservaciones,
  EstadoEvidencia.Validado,
  EstadoEvidencia.Rechazado,
];

export interface DocumentoAvancePanel {
  codigoGuia: string;
  porcentajeInterno: number;
  peso: number;
}

export interface UmbralesSemaforoAvance {
  minimoVerde: number;
  minimoAmarillo: number;
}

export const UMBRALES_SEMAFORO_AVANCE_DEFECTO: UmbralesSemaforoAvance = {
  minimoVerde: 100,
  minimoAmarillo: 55,
};

/**
 * Umbrales de vigencia de la resolución MEN (T-010.2/T-007.3a, configurables en `ConfiguracionSIAC`).
 * Regla vigente (20/10/2026): vigencia 7 años; amarillo 12 meses antes del fin (inicio del año 7);
 * rojo 6 meses antes del fin; «Vencido» al terminar. Antes eran 24/18 (PO 13/10).
 */
export interface UmbralesSemaforoVigencia {
  aniosVigencia: number;
  mesesAvisoVigencia: number;
  mesesRojoVigencia: number;
}

export const UMBRALES_SEMAFORO_VIGENCIA_DEFECTO: UmbralesSemaforoVigencia = {
  aniosVigencia: 7,
  mesesAvisoVigencia: 12,
  mesesRojoVigencia: 6,
};

export type UmbralesSemaforo = UmbralesSemaforoAvance & UmbralesSemaforoVigencia;

export const UMBRALES_SEMAFORO_DEFECTO: UmbralesSemaforo = {
  ...UMBRALES_SEMAFORO_AVANCE_DEFECTO,
  ...UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
};

/**
 * Sin resolución registrada el semáforo de vigencia es gris («Sin vigencia»), nunca verde.
 * «Vencido» (fin de los 7 años) es distinto de «Rojo» (ventana de 6 meses antes del fin).
 */
export type ColorSemaforoVigencia = ColorSemaforo | 'Vencido' | 'SinVigencia';

/** Escala de la demo acelerada (§0): mapea el reloj real a la ventana de vigencia. */
export interface EscalaDemoVigencia {
  /** Marca de tiempo real (ms) en la que inicia la simulación. */
  inicioMs: number;
  /** Duración real de la simulación (ms); por defecto 300 s = 300000. */
  duracionMs: number;
}

/** Fechas límite del semáforo de vigencia a partir de la resolución. */
export interface HitosVigencia {
  fin: Date;
  inicioAmarillo: Date;
  inicioRojo: Date;
}

/** Lanza si los umbrales son incoherentes (se usa al arrancar el backend). */
export function validarUmbralesSemaforo(umbrales: UmbralesSemaforo): void {
  const errores: string[] = [];
  const {
    minimoVerde,
    minimoAmarillo,
    aniosVigencia,
    mesesAvisoVigencia,
    mesesRojoVigencia,
  } = umbrales;
  if (!(minimoVerde > 0 && minimoVerde <= 100)) errores.push('avanceMinimoVerde debe estar entre 1 y 100');
  if (!(minimoAmarillo >= 0 && minimoAmarillo < minimoVerde)) {
    errores.push('avanceMinimoAmarillo debe ser ≥ 0 y menor que avanceMinimoVerde');
  }
  if (!(Number.isInteger(aniosVigencia) && aniosVigencia > 0)) errores.push('aniosVigencia debe ser un entero > 0');
  const mesesVigenciaCompleta = aniosVigencia * 12;
  // Decisión 16/10/2026: el rojo siempre ocurre antes del fin de vigencia (≥ 1 mes), igual que el DTO.
  if (!(Number.isInteger(mesesRojoVigencia) && mesesRojoVigencia >= 1)) {
    errores.push('mesesRojoVigencia debe ser un entero ≥ 1');
  }
  if (!(Number.isInteger(mesesAvisoVigencia) && mesesAvisoVigencia > mesesRojoVigencia)) {
    errores.push('mesesAvisoVigencia debe ser un entero mayor que mesesRojoVigencia');
  }
  if (!(mesesAvisoVigencia < mesesVigenciaCompleta)) {
    errores.push('mesesAvisoVigencia debe ser menor que la vigencia completa');
  }
  if (errores.length > 0) {
    throw new Error(`Umbrales de semáforo incoherentes: ${errores.join('; ')}.`);
  }
}

/** Suma meses en calendario UTC (la resolución se guarda como fecha sin hora). */
function sumarMesesUtc(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha.getTime());
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);
  return resultado;
}

/** Fin de vigencia = fecha de la resolución + N años (7 por defecto). */
export function calcularFechaFinVigencia(
  fechaResolucion: Date,
  aniosVigencia: number = UMBRALES_SEMAFORO_VIGENCIA_DEFECTO.aniosVigencia,
): Date {
  return sumarMesesUtc(fechaResolucion, aniosVigencia * 12);
}

/**
 * Hitos del semáforo de vigencia (T-007.3a):
 * `fin` = resolución + años; `inicioAmarillo` = fin − mesesAviso; `inicioRojo` = fin − mesesRojo.
 */
export function calcularHitosVigencia(
  fechaResolucion: Date,
  umbrales: UmbralesSemaforoVigencia = UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
): HitosVigencia {
  const fin = calcularFechaFinVigencia(fechaResolucion, umbrales.aniosVigencia);
  return {
    fin,
    inicioAmarillo: sumarMesesUtc(fin, -umbrales.mesesAvisoVigencia),
    inicioRojo: sumarMesesUtc(fin, -umbrales.mesesRojoVigencia),
  };
}

export function esEstadoRevisado(estado: EstadoEvidencia): boolean {
  return ESTADOS_EVIDENCIA_REVISADOS.includes(estado);
}

/** Redondeo de presentación a 2 decimales (solo al final, nunca en pasos intermedios). */
export function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Avance ponderado: suma de (porcentajeInterno × peso / 100), redondeada una sola vez.
 * R-010.1a: los porcentajes deben llegar sin redondear (8/9 × 90 = 80,0 y no 80,1).
 */
export function calcularAvancePonderado(documentos: DocumentoAvancePanel[]): number {
  if (documentos.length === 0) return 0;
  const total = documentos.reduce(
    (acc, doc) => acc + (doc.porcentajeInterno * doc.peso) / 100,
    0,
  );
  return redondear2(total);
}

export function calcularSemaforoAvance(
  avancePorcentual: number,
  umbrales: UmbralesSemaforoAvance = UMBRALES_SEMAFORO_AVANCE_DEFECTO,
): ColorSemaforo {
  if (avancePorcentual >= umbrales.minimoVerde) return 'Verde';
  if (avancePorcentual >= umbrales.minimoAmarillo) return 'Amarillo';
  return 'Rojo';
}

/**
 * Mapea el reloj real de la demo acelerada (§0) a una fecha de referencia «como si» hubieran
 * pasado hasta `aniosVigencia` años desde la resolución, en `duracionPruebaSeg` segundos reales.
 */
export function calcularReferenciaDemoVigencia(
  fechaResolucion: Date,
  inicioDemoMs: number,
  ahoraMs: number,
  duracionPruebaSeg: number,
  aniosVigencia: number,
): Date {
  const fin = calcularFechaFinVigencia(fechaResolucion, aniosVigencia);
  const duracionVigenciaMs = fin.getTime() - fechaResolucion.getTime();
  const transcurridoSeg = Math.max(0, (ahoraMs - inicioDemoMs) / 1000);
  const fraccion = duracionPruebaSeg > 0 ? Math.min(1, transcurridoSeg / duracionPruebaSeg) : 1;
  return new Date(fechaResolucion.getTime() + duracionVigenciaMs * fraccion);
}

/**
 * Semáforo de vigencia calculado al consultar desde la fecha de la resolución MEN.
 * - Sin resolución: «SinVigencia» (gris), nunca verde.
 * - Verde hasta `mesesAvisoVigencia` antes del fin; amarillo desde ahí (año 6 de 7);
 *   rojo dentro de `mesesRojoVigencia` antes del fin; «Vencido» al terminar la vigencia.
 * - `escala` (§0): si se indica, la referencia se calcula sobre la demo acelerada y el
 *   avance de color es proporcional a los umbrales de BD.
 */
export function calcularSemaforoVigencia(
  fechaResolucion: Date | null | undefined,
  referencia: Date = new Date(),
  umbrales: UmbralesSemaforoVigencia = UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
  escala?: EscalaDemoVigencia,
): ColorSemaforoVigencia {
  if (!fechaResolucion) return 'SinVigencia';

  const fechaReferencia = escala
    ? calcularReferenciaDemoVigencia(
        fechaResolucion,
        escala.inicioMs,
        referencia.getTime(),
        escala.duracionMs / 1000,
        umbrales.aniosVigencia,
      )
    : referencia;

  const { fin, inicioAmarillo, inicioRojo } = calcularHitosVigencia(fechaResolucion, umbrales);
  const t = fechaReferencia.getTime();
  if (t >= fin.getTime()) return 'Vencido';
  if (t >= inicioRojo.getTime()) return 'Rojo';
  if (t >= inicioAmarillo.getTime()) return 'Amarillo';
  return 'Verde';
}

/** Umbral de aviso de vigencia (coincide con `UmbralVigenciaCorreo`). */
export type UmbralAvisoVigencia = 'amarillo' | 'rojo' | 'vencido';

/** Orden de los avisos de vigencia: cada color incluye los anteriores. */
export const ORDEN_UMBRALES_VIGENCIA: readonly UmbralAvisoVigencia[] = ['amarillo', 'rojo', 'vencido'];

/**
 * Umbrales de aviso alcanzados por un semáforo, en orden (Amarillo → Rojo → Vencido).
 * Ej.: «Vencido» devuelve los tres para que un aviso intermedio perdido (un tick tardío en la
 * demo acelerada) se recupere; la clave idempotente evita repetir los ya enviados.
 */
export function umbralesVigenciaAlcanzados(semaforo: ColorSemaforoVigencia): UmbralAvisoVigencia[] {
  if (semaforo === 'Amarillo') return ['amarillo'];
  if (semaforo === 'Rojo') return ['amarillo', 'rojo'];
  if (semaforo === 'Vencido') return [...ORDEN_UMBRALES_VIGENCIA];
  return [];
}

/** Resultado de validar la duración de la demo acelerada frente al intervalo del tick. */
export interface ValidacionDuracionDemoVigencia {
  valida: boolean;
  /** Ventana más corta (amarillo o rojo) en segundos reales. */
  ventanaMinimaSeg: number;
  /** Duración mínima para que cada color dure al menos dos evaluaciones. */
  duracionMinimaSeg: number;
}

/**
 * Fix A (27/10): cada color de la demo debe durar al menos dos evaluaciones del tick; si no,
 * el aviso de ese color depende de la recuperación y la barra salta colores.
 * Ventana amarilla = (mesesAviso − mesesRojo) / (años·12); ventana roja = mesesRojo / (años·12).
 */
export function validarDuracionDemoVigencia(
  duracionSeg: number,
  intervaloSeg: number,
  umbrales: UmbralesSemaforoVigencia,
): ValidacionDuracionDemoVigencia {
  const mesesTotales = umbrales.aniosVigencia * 12;
  const fraccionAmarillo = (umbrales.mesesAvisoVigencia - umbrales.mesesRojoVigencia) / mesesTotales;
  const fraccionRojo = umbrales.mesesRojoVigencia / mesesTotales;
  const fraccionMinima = Math.min(fraccionAmarillo, fraccionRojo);
  const ventanaMinimaSeg = duracionSeg * fraccionMinima;
  const duracionMinimaSeg = fraccionMinima > 0 ? Math.ceil((2 * intervaloSeg) / fraccionMinima) : Infinity;
  return {
    valida: fraccionMinima > 0 && ventanaMinimaSeg >= 2 * intervaloSeg,
    ventanaMinimaSeg,
    duracionMinimaSeg,
  };
}

/**
 * Segundos que faltan para «Vencido»: en la demo se cuenta la duración de la simulación;
 * en tiempo real, el tiempo hasta el fin de la vigencia.
 */
export function calcularSegundosRestantesVigencia(
  fechaResolucion: Date | null | undefined,
  referencia: Date = new Date(),
  umbrales: UmbralesSemaforoVigencia = UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
  escala?: EscalaDemoVigencia,
): number {
  if (!fechaResolucion) return 0;
  if (escala) {
    const finDemoMs = escala.inicioMs + escala.duracionMs;
    return Math.max(0, Math.ceil((finDemoMs - referencia.getTime()) / 1000));
  }
  const fin = calcularFechaFinVigencia(fechaResolucion, umbrales.aniosVigencia);
  return Math.max(0, Math.ceil((fin.getTime() - referencia.getTime()) / 1000));
}

/**
 * Semáforo general (opción B, PO 13/10): RN-003 (anexo de infraestructura vencido) fuerza rojo;
 * si no, el peor entre avance y vigencia (Verde < Amarillo < Rojo; «Vencido» cuenta como Rojo).
 * «SinVigencia» se ignora: manda el avance. Nunca devuelve gris.
 */
export function calcularSemaforoGeneral(
  semaforoAvance: ColorSemaforo,
  semaforoVigencia: ColorSemaforoVigencia,
  anexoInfraestructuraVencido: boolean,
): ColorSemaforo {
  if (anexoInfraestructuraVencido) return 'Rojo';
  if (semaforoVigencia === 'SinVigencia') return semaforoAvance;
  const vigenciaComoColor: ColorSemaforo = semaforoVigencia === 'Vencido' ? 'Rojo' : semaforoVigencia;
  return colorMasCritico([semaforoAvance, vigenciaComoColor]);
}

/** Valida que los pesos de un trámite sumen 100 %. */
export function validarPesosTramite(pesos: number[]): void {
  const suma = pesos.reduce((acc, p) => acc + p, 0);
  if (suma !== 100) {
    throw new Error(`Los pesos del trámite deben sumar 100 % (actual: ${suma}).`);
  }
}

/** Indica si el trámite tiene al menos un documento revisado para reportar avance. */
export function tieneDocumentosRevisados(
  documentos: { revisado: boolean }[],
): boolean {
  return documentos.some((doc) => doc.revisado);
}
