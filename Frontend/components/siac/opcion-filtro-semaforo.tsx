import type { ContextoSemaforoUi, ValorSemaforoUi } from '@/lib/utilidades/etiquetas-semaforo'
import {
  CLASES_PUNTO_SEMAFORO,
  etiquetaVisibleSemaforo,
} from '@/lib/utilidades/etiquetas-semaforo'
import { cn } from '@/lib/utils'

export function OpcionFiltroSemaforo({
  valor,
  contexto,
}: {
  valor: ValorSemaforoUi
  contexto: ContextoSemaforoUi
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn('size-2.5 shrink-0 rounded-full', CLASES_PUNTO_SEMAFORO[valor])}
        aria-hidden
      />
      <span>{etiquetaVisibleSemaforo(valor, contexto)}</span>
    </span>
  )
}
