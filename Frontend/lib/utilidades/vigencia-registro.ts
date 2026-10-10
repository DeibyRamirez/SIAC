import type { SemaforoPrograma, SemaforoVigencia } from '@/lib/tipos'

/** Valores por defecto; el backend los lee de `ConfiguracionSIAC` (T-010.2) y manda el semáforo ya calculado. */
export const ANIOS_VIGENCIA_REGISTRO = 7
export const MESES_AVISO_VIGENCIA = 12
/** Año desde el que el semáforo pasa a amarillo (7 años − 12 meses = año 6). */
export const ANIOS_VIGENCIA_AMARILLO = ANIOS_VIGENCIA_REGISTRO - MESES_AVISO_VIGENCIA / 12

/** Semáforo de avance documental (misma regla que panel-siac backend). */
export function calcularSemaforoAvance(avancePorcentual: number): SemaforoPrograma {
  if (avancePorcentual >= 100) return 'Verde'
  if (avancePorcentual >= 55) return 'Amarillo'
  return 'Rojo'
}

const MS_POR_ANIO = 365.25 * 24 * 60 * 60 * 1000

export function calcularAniosTranscurridos(
  fechaResolucion: Date | string | null | undefined,
  referencia: Date = new Date(),
): number {
  if (!fechaResolucion) return 0
  const inicio = typeof fechaResolucion === 'string' ? new Date(fechaResolucion) : fechaResolucion
  const ms = referencia.getTime() - inicio.getTime()
  return Math.max(0, ms / MS_POR_ANIO)
}

export function calcularPorcentajeVigencia(
  fechaResolucion: Date | string | null | undefined,
  referencia: Date = new Date(),
): number {
  const anios = calcularAniosTranscurridos(fechaResolucion, referencia)
  return Math.min(100, Math.round((anios / ANIOS_VIGENCIA_REGISTRO) * 100))
}

function sumarMesesUtc(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha.getTime())
  resultado.setUTCMonth(resultado.getUTCMonth() + meses)
  return resultado
}

/** Fin de vigencia = fecha de resolución + 7 años. */
export function calcularFechaFinVigencia(fechaResolucion: Date | string): Date {
  const inicio = typeof fechaResolucion === 'string' ? new Date(fechaResolucion) : fechaResolucion
  return sumarMesesUtc(inicio, ANIOS_VIGENCIA_REGISTRO * 12)
}

/** Misma regla que `panel-siac.ts` del backend: sin resolución → «SinVigencia», nunca verde. */
export function calcularSemaforoVigencia(
  fechaResolucion: Date | string | null | undefined,
  referencia: Date = new Date(),
): SemaforoVigencia {
  if (!fechaResolucion) return 'SinVigencia'

  const fin = calcularFechaFinVigencia(fechaResolucion)
  if (referencia.getTime() >= fin.getTime()) return 'Rojo'
  if (referencia.getTime() >= sumarMesesUtc(fin, -MESES_AVISO_VIGENCIA).getTime()) return 'Amarillo'
  return 'Verde'
}

export function mensajeAlertaVigencia(
  fechaResolucion: Date | string | null | undefined,
  nombreEntidad: string,
  referencia: Date = new Date(),
): string | null {
  const semaforo = calcularSemaforoVigencia(fechaResolucion, referencia)
  if (semaforo === 'Amarillo') {
    const anios = Math.floor(calcularAniosTranscurridos(fechaResolucion, referencia))
    return `Estamos en el año ${anios} de ${ANIOS_VIGENCIA_REGISTRO}. Próximo al proceso de renovación de ${nombreEntidad}.`
  }
  if (semaforo === 'Rojo') {
    return `La vigencia de registro de ${nombreEntidad} ha superado los ${ANIOS_VIGENCIA_REGISTRO} años. Inicie el proceso de renovación.`
  }
  return null
}

export function etiquetaAniosVigencia(
  fechaResolucion: Date | string | null | undefined,
  referencia: Date = new Date(),
): string {
  const anios = calcularAniosTranscurridos(fechaResolucion, referencia)
  const anioActual = Math.min(ANIOS_VIGENCIA_REGISTRO, Math.floor(anios) + 1)
  return `Año ${anioActual} de ${ANIOS_VIGENCIA_REGISTRO}`
}
