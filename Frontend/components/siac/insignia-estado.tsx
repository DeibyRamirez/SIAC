import type { EstadoEvidencia, EstadoVigencia, SemaforoVigencia } from '@/lib/tipos'
import type { ContextoSemaforoUi, ValorSemaforoUi } from '@/lib/utilidades/etiquetas-semaforo'
import {
  ariaLabelSemaforo,
  CLASES_PUNTO_SEMAFORO,
  etiquetaVisibleSemaforo,
} from '@/lib/utilidades/etiquetas-semaforo'
import { etiquetaEstadoVigenciaAnexo } from '@/lib/utilidades/etiquetas-semaforo'
import { etiquetaEstadoEvidencia } from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

const estilosEvidencia: Record<EstadoEvidencia, string> = {
  Borrador: 'bg-secondary text-primary border border-primary/20',
  EnRevision: 'bg-ocre/15 text-ocre border border-ocre/30',
  ConObservaciones: 'bg-coral/15 text-coral border border-coral/30',
  Cumple: 'bg-esmeralda/15 text-esmeralda border border-esmeralda/30',
  Validado: 'bg-esmeralda/15 text-esmeralda border border-esmeralda/30',
  Rechazado: 'bg-fucsia/15 text-fucsia border border-fucsia/30',
}

const estilosVigencia: Record<EstadoVigencia, string> = {
  Vigente: 'bg-esmeralda/15 text-esmeralda border border-esmeralda/30',
  Proximo: 'bg-coral/15 text-coral border border-coral/30',
  Vencido: 'bg-fucsia/15 text-fucsia border border-fucsia/30',
}

export function InsigniaEstado({
  estado,
  tipo = 'evidencia',
}: {
  estado: EstadoEvidencia | EstadoVigencia
  tipo?: 'evidencia' | 'vigencia'
}) {
  const clases =
    tipo === 'vigencia'
      ? estilosVigencia[estado as EstadoVigencia]
      : estilosEvidencia[estado as EstadoEvidencia]

  const etiqueta =
    tipo === 'evidencia'
      ? etiquetaEstadoEvidencia(estado as EstadoEvidencia)
      : etiquetaEstadoVigenciaAnexo(estado as EstadoVigencia)

  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-bold', clases)}>
      {etiqueta}
    </span>
  )
}

export function Semaforo({
  valor,
  contexto = 'avancePrograma',
  etiqueta,
}: {
  valor: SemaforoVigencia | 'Gris'
  contexto?: ContextoSemaforoUi
  /** Prefijo de sección (p. ej. «Avance»); no muestra nombres de color. */
  etiqueta?: string
}) {
  const valorUi = valor as ValorSemaforoUi
  const texto = etiquetaVisibleSemaforo(valorUi, contexto)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"
      aria-label={ariaLabelSemaforo(valorUi, contexto, etiqueta)}
    >
      <span
        className={cn('size-2.5 rounded-full ring-2 ring-white', CLASES_PUNTO_SEMAFORO[valorUi])}
        aria-hidden
      />
      {etiqueta ? <span className="text-muted-foreground">{etiqueta}:</span> : null}
      <span>{texto}</span>
    </span>
  )
}
