import type { SemaforoPrograma, SemaforoVigencia } from '@/lib/tipos'

/** Valores por defecto; el backend los lee de `ConfiguracionSIAC` (T-010.2) y manda el semáforo ya calculado. */
export const ANIOS_VIGENCIA_REGISTRO = 7
/** Regla vigente (20/10/2026): amarillo desde 12 meses antes del fin (inicio del año 7). */
export const MESES_AVISO_VIGENCIA = 12
/** Regla vigente (20/10/2026): rojo 6 meses antes del fin. */
export const MESES_ROJO_VIGENCIA = 6
/**
 * §0 Demo acelerada: duración por defecto si el servidor no informa `duracionSeg`
 * (VIGENCIA_DURACION_PRUEBA_SEG, 300 s ≈ 7 años: amarillo ≈257 s, rojo ≈279 s).
 */
export const DURACION_DEMO_VIGENCIA_MS = 300 * 1000
/** Años cumplidos desde los que el semáforo pasa a amarillo (7 años − 12 meses = 6, es decir, inicio del año 7). */
export const ANIOS_VIGENCIA_AMARILLO = (ANIOS_VIGENCIA_REGISTRO * 12 - MESES_AVISO_VIGENCIA) / 12
export const ANIOS_VIGENCIA_ROJO = (ANIOS_VIGENCIA_REGISTRO * 12 - MESES_ROJO_VIGENCIA) / 12

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

/**
 * Misma regla que `panel-siac.ts` del backend: sin resolución → «SinVigencia» (gris), nunca verde;
 * «Vencido» cuando pasan los 7 años, distinto de «Rojo» (6 meses antes del fin).
 */
export function calcularSemaforoVigencia(
  fechaResolucion: Date | string | null | undefined,
  referencia: Date = new Date(),
): SemaforoVigencia {
  if (!fechaResolucion) return 'SinVigencia'

  const fin = calcularFechaFinVigencia(fechaResolucion)
  if (referencia.getTime() >= fin.getTime()) return 'Vencido'
  if (referencia.getTime() >= sumarMesesUtc(fin, -MESES_ROJO_VIGENCIA).getTime()) return 'Rojo'
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
    return `La vigencia de registro de ${nombreEntidad} entra en los últimos ${MESES_ROJO_VIGENCIA} meses. El proceso de renovación debe continuar a tiempo.`
  }
  if (semaforo === 'Vencido') {
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

export function claveSessionDemoVigencia(entidadId: string): string {
  return `siac-demo-vigencia:${entidadId}`
}

/** ¿Hay una sesión de demo de vigencia activa en este navegador? (para el polling de 5 s). */
export function hayDemoVigenciaEnCurso(): boolean {
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const clave = sessionStorage.key(i)
      if (clave?.startsWith('siac-demo-vigencia:')) return true
    }
  } catch {
    /* privado / sin storage */
  }
  return false
}

/** Fracción 0..1 del tiempo de demo ya transcurrido (duración informada por el servidor). */
export function fraccionDemoVigenciaTranscurrida(
  inicioDemoMs: number,
  ahoraMs: number = Date.now(),
  duracionMs: number = DURACION_DEMO_VIGENCIA_MS,
): number {
  const transcurrido = Math.max(0, ahoraMs - inicioDemoMs)
  return Math.min(1, transcurrido / Math.max(1, duracionMs))
}

/**
 * Mapea el reloj de la demo (duración del servidor) a una fecha «como si» hubieran pasado hasta 7 años desde la resolución.
 */
export function calcularReferenciaDemoVigencia(
  fechaResolucion: Date | string,
  inicioDemoMs: number,
  ahoraMs: number = Date.now(),
  duracionMs: number = DURACION_DEMO_VIGENCIA_MS,
): Date {
  const inicio =
    typeof fechaResolucion === 'string' ? new Date(fechaResolucion) : fechaResolucion
  const fin = calcularFechaFinVigencia(fechaResolucion)
  const duracionVigenciaMs = fin.getTime() - inicio.getTime()
  const fraccion = fraccionDemoVigenciaTranscurrida(inicioDemoMs, ahoraMs, duracionMs)
  return new Date(inicio.getTime() + duracionVigenciaMs * fraccion)
}

export function demoVigenciaFinalizada(
  inicioDemoMs: number,
  ahoraMs: number = Date.now(),
  duracionMs: number = DURACION_DEMO_VIGENCIA_MS,
): boolean {
  return fraccionDemoVigenciaTranscurrida(inicioDemoMs, ahoraMs, duracionMs) >= 1
}

/**
 * Lectura de GET /vigencias/demo/estado: decide si la barra local debe detenerse porque el
 * servidor ya no tiene la sesión (se detuvo, se reinició la API o se apagó el modo prueba).
 */
export function sesionDemoVigenciaTerminada(estado: { modoPrueba: boolean; activa: boolean }): boolean {
  return !estado.modoPrueba || !estado.activa
}

/** Texto del botón de la demo según la duración del servidor: «5 min», «7 min», «4 min 40 s». */
export function etiquetaDuracionDemoVigencia(duracionMs: number): string {
  const totalSeg = Math.max(0, Math.round(duracionMs / 1000))
  const min = Math.floor(totalSeg / 60)
  const seg = totalSeg % 60
  if (min === 0) return `${seg} s`
  return seg === 0 ? `${min} min` : `${min} min ${seg} s`
}
