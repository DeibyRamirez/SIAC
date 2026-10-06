import type { EstadoEvidencia, EstadoVigencia, SemaforoVigencia } from '@/lib/tipos'
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

const estilosSemaforo: Record<SemaforoVigencia, string> = {
  Verde: 'bg-esmeralda',
  Amarillo: 'bg-ocre',
  Rojo: 'bg-fucsia',
  SinVigencia: 'bg-muted-foreground/40',
}

const etiquetasSemaforo: Record<SemaforoVigencia, string> = {
  Verde: 'Verde',
  Amarillo: 'Amarillo',
  Rojo: 'Rojo',
  SinVigencia: 'Sin vigencia',
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
      : estado

  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-bold', clases)}>
      {etiqueta}
    </span>
  )
}

export function Semaforo({
  valor,
  etiqueta,
}: {
  valor: SemaforoVigencia
  etiqueta?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
      <span className={cn('size-2.5 rounded-full ring-2 ring-white', estilosSemaforo[valor])} />
      {etiqueta ? <span className="text-muted-foreground">{etiqueta}:</span> : null}
      {etiquetasSemaforo[valor]}
    </span>
  )
}
