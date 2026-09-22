'use client'

import { cn } from '@/lib/utils'

interface FiltrosSegmentadosProps {
  opciones: { valor: string; etiqueta: string }[]
  valorActivo: string
  onCambiar: (valor: string) => void
  className?: string
}

export function FiltrosSegmentados({
  opciones,
  valorActivo,
  onCambiar,
  className,
}: FiltrosSegmentadosProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 rounded-xl border border-primary/15 bg-white p-1 shadow-sm',
        className,
      )}
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onCambiar(opcion.valor)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all',
            valorActivo === opcion.valor
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-primary',
          )}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
