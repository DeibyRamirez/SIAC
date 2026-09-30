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

export const ANIOS_VIGENCIA_REGISTRO = 7;
export const ANIOS_VIGENCIA_AMARILLO = 6;

export function esEstadoRevisado(estado: EstadoEvidencia): boolean {
  return ESTADOS_EVIDENCIA_REVISADOS.includes(estado);
}

/** Avance ponderado: suma de (porcentajeInterno × peso / 100). */
export function calcularAvancePonderado(documentos: DocumentoAvancePanel[]): number {
  if (documentos.length === 0) return 0;
  const total = documentos.reduce(
    (acc, doc) => acc + (doc.porcentajeInterno * doc.peso) / 100,
    0,
  );
  return Math.round(total * 100) / 100;
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
 * Semáforo de vigencia desde la fecha de resolución (7 años de vigencia).
 * Verde: < 6 años; Amarillo: ≥ 6 y ≤ 7 años; Rojo: > 7 años.
 */
export function calcularSemaforoVigencia(
  fechaResolucion: Date | null | undefined,
  referencia: Date = new Date(),
): ColorSemaforo {
  if (!fechaResolucion) return 'Verde';

  const msTranscurridos = referencia.getTime() - fechaResolucion.getTime();
  const aniosTranscurridos = msTranscurridos / (365.25 * 24 * 60 * 60 * 1000);

  if (aniosTranscurridos > ANIOS_VIGENCIA_REGISTRO) return 'Rojo';
  if (aniosTranscurridos >= ANIOS_VIGENCIA_AMARILLO) return 'Amarillo';
  return 'Verde';
}

export function calcularSemaforoGeneral(
  semaforoAvance: ColorSemaforo,
  semaforoVigencia: ColorSemaforo,
  anexoInfraestructuraVencido: boolean,
): ColorSemaforo {
  if (anexoInfraestructuraVencido) return 'Rojo';
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
