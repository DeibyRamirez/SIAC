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

/** Umbrales de vigencia de la resolución MEN (T-010.2, configurables en `ConfiguracionSIAC`). */
export interface UmbralesSemaforoVigencia {
  aniosVigencia: number;
  mesesAvisoVigencia: number;
}

export const UMBRALES_SEMAFORO_VIGENCIA_DEFECTO: UmbralesSemaforoVigencia = {
  aniosVigencia: 7,
  mesesAvisoVigencia: 12,
};

export type UmbralesSemaforo = UmbralesSemaforoAvance & UmbralesSemaforoVigencia;

export const UMBRALES_SEMAFORO_DEFECTO: UmbralesSemaforo = {
  ...UMBRALES_SEMAFORO_AVANCE_DEFECTO,
  ...UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
};

/** Sin resolución registrada el semáforo de vigencia es gris («Sin vigencia»), nunca verde. */
export type ColorSemaforoVigencia = ColorSemaforo | 'SinVigencia';

/** Lanza si los umbrales son incoherentes (se usa al arrancar el backend). */
export function validarUmbralesSemaforo(umbrales: UmbralesSemaforo): void {
  const errores: string[] = [];
  const { minimoVerde, minimoAmarillo, aniosVigencia, mesesAvisoVigencia } = umbrales;
  if (!(minimoVerde > 0 && minimoVerde <= 100)) errores.push('avanceMinimoVerde debe estar entre 1 y 100');
  if (!(minimoAmarillo >= 0 && minimoAmarillo < minimoVerde)) {
    errores.push('avanceMinimoAmarillo debe ser ≥ 0 y menor que avanceMinimoVerde');
  }
  if (!(Number.isInteger(aniosVigencia) && aniosVigencia > 0)) errores.push('aniosVigencia debe ser un entero > 0');
  if (!(Number.isInteger(mesesAvisoVigencia) && mesesAvisoVigencia > 0 && mesesAvisoVigencia < aniosVigencia * 12)) {
    errores.push('mesesAvisoVigencia debe ser un entero > 0 y menor que la vigencia completa');
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
 * Semáforo de vigencia calculado al consultar desde la fecha de la resolución MEN.
 * - Sin resolución: «SinVigencia» (gris), nunca verde.
 * - Verde hasta `mesesAvisoVigencia` antes del fin; amarillo desde ahí (año 6 de 7);
 *   rojo cuando la vigencia ya terminó.
 */
export function calcularSemaforoVigencia(
  fechaResolucion: Date | null | undefined,
  referencia: Date = new Date(),
  umbrales: UmbralesSemaforoVigencia = UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
): ColorSemaforoVigencia {
  if (!fechaResolucion) return 'SinVigencia';

  const fin = calcularFechaFinVigencia(fechaResolucion, umbrales.aniosVigencia);
  const inicioAviso = sumarMesesUtc(fin, -umbrales.mesesAvisoVigencia);

  if (referencia.getTime() >= fin.getTime()) return 'Rojo';
  if (referencia.getTime() >= inicioAviso.getTime()) return 'Amarillo';
  return 'Verde';
}

/**
 * Semáforo general: RN-003 (anexo de infraestructura vencido) fuerza rojo; si no, el más
 * crítico entre avance y vigencia. «SinVigencia» no empeora ni mejora el avance.
 */
export function calcularSemaforoGeneral(
  semaforoAvance: ColorSemaforo,
  semaforoVigencia: ColorSemaforoVigencia,
  anexoInfraestructuraVencido: boolean,
): ColorSemaforo {
  if (anexoInfraestructuraVencido) return 'Rojo';
  if (semaforoVigencia === 'SinVigencia') return semaforoAvance;
  return colorMasCritico([semaforoAvance, semaforoVigencia]);
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
