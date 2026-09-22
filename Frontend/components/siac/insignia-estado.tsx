import type { EstadoEvidencia, EstadoVigencia, SemaforoPrograma } from '@/lib/tipos'
import { cn } from '@/lib/utils'

const estilosEvidencia: Record<EstadoEvidencia, string> = {
  Borrador: 'bg-slate-100 text-slate-700',
  EnRevision: 'bg-amber-100 text-amber-800',
  Validado: 'bg-emerald-100 text-emerald-800',
  Rechazado: 'bg-red-100 text-red-800',
}

const estilosVigencia: Record<EstadoVigencia, string> = {
  Vigente: 'bg-emerald-100 text-emerald-800',
  Proximo: 'bg-amber-100 text-amber-800',
  Vencido: 'bg-red-100 text-red-800',
}

const estilosSemaforo: Record<SemaforoPrograma, string> = {
  Verde: 'bg-emerald-500',
  Amarillo: 'bg-amber-500',
  Rojo: 'bg-red-500',
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

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', clases)}>
      {estado}
    </span>
  )
}

export function Semaforo({ valor }: { valor: SemaforoPrograma }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
      <span className={cn('size-2.5 rounded-full', estilosSemaforo[valor])} />
      {valor}
    </span>
  )
}
