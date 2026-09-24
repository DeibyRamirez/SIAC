'use client'

import { Check, X } from 'lucide-react'

import {
  etiquetaCondicion,
  type EvaluacionCondicionEvidencia,
} from '@/lib/condiciones-documento-maestro'

interface ResumenObservacionesPorCondicionProps {
  evaluaciones: EvaluacionCondicionEvidencia[]
  porcentajeCompletitud?: number
}

export function ResumenObservacionesPorCondicion({
  evaluaciones,
  porcentajeCompletitud,
}: ResumenObservacionesPorCondicionProps) {
  if (evaluaciones.length === 0) return null

  return (
    <div className="rounded-xl border border-fucsia/30 bg-fucsia/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">
          Evaluación por condiciones del Documento Maestro
        </p>
        {porcentajeCompletitud !== undefined && (
          <span className="text-sm font-medium text-esmeralda">
            Avance del documento: {porcentajeCompletitud}%
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {evaluaciones.map((ev) => (
          <li
            key={ev.codigoCondicion}
            className="flex gap-2 rounded-lg bg-background/80 px-3 py-2 text-sm"
          >
            {ev.cumple ? (
              <Check className="mt-0.5 size-4 shrink-0 text-esmeralda" aria-hidden />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-medium">{etiquetaCondicion(ev.codigoCondicion)}</p>
              {!ev.cumple && ev.observacion && (
                <p className="mt-0.5 text-muted-foreground">{ev.observacion}</p>
              )}
              {ev.cumple && (
                <p className="text-xs text-muted-foreground">Cumple la condición.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
