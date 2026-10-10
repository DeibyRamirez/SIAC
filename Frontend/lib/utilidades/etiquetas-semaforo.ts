import type { EstadoVigencia, SemaforoPrograma, SemaforoVigencia } from '@/lib/tipos'

/** Contexto de la etiqueta visible (no confundir con el valor API/URL). */
export type ContextoSemaforoUi = 'vigenciaRegistro' | 'avancePrograma' | 'puntajeDocumento'

export type ValorSemaforoUi = SemaforoVigencia | 'Gris'

const ETIQUETAS_VIGENCIA_REGISTRO: Record<SemaforoVigencia, string> = {
  SinVigencia: 'Sin vigencia',
  Verde: 'Vigente',
  Amarillo: 'Próximo a vencer',
  Rojo: 'Vencida',
}

const ETIQUETAS_AVANCE_PROGRAMA: Record<SemaforoPrograma, string> = {
  Verde: 'Completado',
  Amarillo: 'En progreso',
  Rojo: 'Atención requerida',
}

const ETIQUETAS_PUNTAJE_DOCUMENTO: Record<SemaforoPrograma | 'Gris', string> = {
  Verde: 'Cumplimiento total',
  Amarillo: 'En proceso',
  Rojo: 'Requiere atención',
  Gris: 'Sin puntaje',
}

/** Solo para aria-label; no mostrar en UI. */
const NOMBRE_COLOR_ARIA: Record<ValorSemaforoUi, string> = {
  SinVigencia: 'gris',
  Verde: 'verde',
  Amarillo: 'ámbar',
  Rojo: 'rojo',
  Gris: 'gris',
}

export const CLASES_PUNTO_SEMAFORO: Record<ValorSemaforoUi, string> = {
  Verde: 'bg-esmeralda',
  Amarillo: 'bg-ocre',
  Rojo: 'bg-fucsia',
  SinVigencia: 'bg-muted-foreground/40',
  Gris: 'bg-muted-foreground/40',
}

const TOTAL_REFERENCIA = 9
const MIN_VERDE = 9
const MIN_AMARILLO = 5

function escalarUmbral(umbral: number, total: number): number {
  if (total === TOTAL_REFERENCIA) return umbral
  return Math.ceil((umbral * total) / TOTAL_REFERENCIA)
}

/** Misma regla que `colorPorPuntaje` en el backend (HU-003 / HU-008). */
export function colorPorPuntajeEvidencia(
  puntaje: number,
  totalCondiciones: number,
): SemaforoPrograma {
  const minVerde = escalarUmbral(MIN_VERDE, totalCondiciones)
  const minAmarillo = escalarUmbral(MIN_AMARILLO, totalCondiciones)
  if (puntaje >= minVerde) return 'Verde'
  if (puntaje >= minAmarillo) return 'Amarillo'
  return 'Rojo'
}

export function etiquetaVisibleSemaforo(
  valor: ValorSemaforoUi,
  contexto: ContextoSemaforoUi,
): string {
  if (valor === 'Gris') return ETIQUETAS_PUNTAJE_DOCUMENTO.Gris
  if (contexto === 'vigenciaRegistro') {
    return ETIQUETAS_VIGENCIA_REGISTRO[valor as SemaforoVigencia]
  }
  if (contexto === 'puntajeDocumento') {
    return ETIQUETAS_PUNTAJE_DOCUMENTO[valor as SemaforoPrograma]
  }
  return ETIQUETAS_AVANCE_PROGRAMA[valor as SemaforoPrograma]
}

export function ariaLabelSemaforo(
  valor: ValorSemaforoUi,
  contexto: ContextoSemaforoUi,
  seccion?: string,
): string {
  const etiqueta = etiquetaVisibleSemaforo(valor, contexto)
  const color = NOMBRE_COLOR_ARIA[valor]
  const prefijo = seccion ? `${seccion}: ` : ''
  return `${prefijo}${etiqueta} (indicador ${color})`
}

export function etiquetaEstadoVigenciaAnexo(estado: EstadoVigencia): string {
  const mapa: Record<EstadoVigencia, string> = {
    Vigente: 'Vigente',
    Proximo: 'Próximo a vencer',
    Vencido: 'Vencido',
  }
  return mapa[estado]
}

export function estadoVigenciaAValorSemaforo(estado: EstadoVigencia): SemaforoPrograma {
  const mapa: Record<EstadoVigencia, SemaforoPrograma> = {
    Vigente: 'Verde',
    Proximo: 'Amarillo',
    Vencido: 'Rojo',
  }
  return mapa[estado]
}

export const OPCIONES_FILTRO_SEMAFORO_PANEL: { valor: SemaforoPrograma; contexto: ContextoSemaforoUi }[] = [
  { valor: 'Verde', contexto: 'avancePrograma' },
  { valor: 'Amarillo', contexto: 'avancePrograma' },
  { valor: 'Rojo', contexto: 'avancePrograma' },
]

export const OPCIONES_FILTRO_SEMAFORO_BUSQUEDA: { valor: ValorSemaforoUi; contexto: ContextoSemaforoUi }[] = [
  { valor: 'Verde', contexto: 'puntajeDocumento' },
  { valor: 'Amarillo', contexto: 'puntajeDocumento' },
  { valor: 'Rojo', contexto: 'puntajeDocumento' },
  { valor: 'Gris', contexto: 'puntajeDocumento' },
]

export function clasesBadgeEstadoProceso(anexoInfraVencido: boolean, avancePorcentual: number): string {
  if (anexoInfraVencido) return 'bg-fucsia/15 text-fucsia border border-fucsia/30'
  if (avancePorcentual >= 100) return 'bg-esmeralda/15 text-esmeralda border border-esmeralda/30'
  return 'bg-ocre/15 text-ocre border border-ocre/30'
}
