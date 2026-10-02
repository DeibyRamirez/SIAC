import { EstadoEvidencia } from '@prisma/client';

/**
 * Regla n/9 de HU-003 (decisiones D1, D2 y D5 aprobadas).
 * - La calificación es binaria por condición; el puntaje es el número entero de condiciones que cumplen.
 * - n < total => "Con observaciones"; n = total => "Cumple".
 * - "Rechazado" y "Validado" no salen del checklist: son la decisión explícita del Revisor (HU-006).
 * - Semáforo sobre 9 condiciones: verde 9, amarillo 5-8, rojo 0-4.
 */

export type ColorSemaforo = 'Verde' | 'Amarillo' | 'Rojo';

export interface UmbralesSemaforo {
  /** Puntaje mínimo (sobre 9) para verde. */
  minimoVerde: number;
  /** Puntaje mínimo (sobre 9) para amarillo. */
  minimoAmarillo: number;
}

/** Total de referencia de los umbrales aprobados (documento maestro de programa G1). */
export const TOTAL_REFERENCIA_SEMAFORO = 9;

export const UMBRALES_SEMAFORO_POR_DEFECTO: UmbralesSemaforo = {
  minimoVerde: 9,
  minimoAmarillo: 5,
};

export interface ResultadoPuntaje {
  puntaje: number;
  totalCondiciones: number;
  estado: EstadoEvidencia;
}

/** Cuenta las condiciones que cumplen (calificación binaria). */
export function calcularPuntaje(condiciones: { cumple: boolean }[]): number {
  return condiciones.filter((condicion) => condicion.cumple).length;
}

/** Estado que resulta del checklist: nunca Rechazado ni Validado. */
export function estadoPorPuntaje(puntaje: number, totalCondiciones: number): EstadoEvidencia {
  validarPuntaje(puntaje, totalCondiciones);
  return puntaje === totalCondiciones
    ? EstadoEvidencia.Cumple
    : EstadoEvidencia.ConObservaciones;
}

/** Aplica la regla completa a un checklist binario. */
export function resolverChecklist(
  condiciones: { cumple: boolean }[],
  totalCondiciones: number,
): ResultadoPuntaje {
  const puntaje = calcularPuntaje(condiciones);
  return { puntaje, totalCondiciones, estado: estadoPorPuntaje(puntaje, totalCondiciones) };
}

/**
 * Color del semáforo para un puntaje n/total.
 * Los umbrales están definidos sobre 9 condiciones; para otros totales (G3 institucional, n/6)
 * se escalan proporcionalmente: verde exige el total y amarillo ceil(total · 5/9) (4 de 6).
 */
export function colorPorPuntaje(
  puntaje: number,
  totalCondiciones: number,
  umbrales: UmbralesSemaforo = UMBRALES_SEMAFORO_POR_DEFECTO,
): ColorSemaforo {
  validarPuntaje(puntaje, totalCondiciones);
  const minimoVerde = escalarUmbral(umbrales.minimoVerde, totalCondiciones);
  const minimoAmarillo = escalarUmbral(umbrales.minimoAmarillo, totalCondiciones);
  if (puntaje >= minimoVerde) return 'Verde';
  if (puntaje >= minimoAmarillo) return 'Amarillo';
  return 'Rojo';
}

/** Devuelve el color más crítico (Rojo > Amarillo > Verde). */
export function colorMasCritico(colores: ColorSemaforo[]): ColorSemaforo {
  if (colores.includes('Rojo')) return 'Rojo';
  if (colores.includes('Amarillo')) return 'Amarillo';
  return 'Verde';
}

/** Texto "n/total" para mensajes y notificaciones. */
export function formatearPuntaje(puntaje: number, totalCondiciones: number): string {
  return `${puntaje}/${totalCondiciones}`;
}

function escalarUmbral(umbral: number, totalCondiciones: number): number {
  if (totalCondiciones === TOTAL_REFERENCIA_SEMAFORO) return umbral;
  return Math.ceil((umbral * totalCondiciones) / TOTAL_REFERENCIA_SEMAFORO);
}

/** Expuesto para filtros de búsqueda HU-008 (semáforo por total de condiciones). */
export function escalarUmbralBusqueda(umbral: number, totalCondiciones: number): number {
  return escalarUmbral(umbral, totalCondiciones);
}

function validarPuntaje(puntaje: number, totalCondiciones: number) {
  if (!Number.isInteger(totalCondiciones) || totalCondiciones <= 0) {
    throw new RangeError('El total de condiciones debe ser un entero positivo.');
  }
  if (!Number.isInteger(puntaje) || puntaje < 0 || puntaje > totalCondiciones) {
    throw new RangeError(`El puntaje debe ser un entero entre 0 y ${totalCondiciones}.`);
  }
}
