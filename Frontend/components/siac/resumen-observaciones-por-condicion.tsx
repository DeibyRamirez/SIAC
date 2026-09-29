'use client'

import { Check, X } from 'lucide-react'

import {
  etiquetaCondicion,
  type EvaluacionCondicionEvidencia,
} from '@/lib/condiciones-documento-maestro'

interface ResumenObservacionesPorCondicionProps {
  evaluaciones: EvaluacionCondicionEvidencia[]
  /** Puntaje entero n (condiciones que cumplen). */
  puntaje?: number | null
  /** Total de condiciones (9 en G1, 6 en G3). Por defecto, las evaluaciones recibidas. */
  totalCondiciones?: number | null
  titulo?: string
  resolverEtiqueta?: (codigo: EvaluacionCondicionEvidencia['codigoCondicion']) => string
}

export function ResumenObservacionesPorCondicion({
  evaluaciones,
  puntaje,
  totalCondiciones,
  titulo = 'Evaluación por condiciones del documento',
  resolverEtiqueta = etiquetaCondicion,
}: ResumenObservacionesPorCondicionProps) {
  if (evaluaciones.length === 0) return null

  const puntajeMostrado = puntaje ?? evaluaciones.filter((ev) => ev.cumple).length
  const totalMostrado = totalCondiciones ?? evaluaciones.length

  return (
    <div className="rounded-xl border border-fucsia/30 bg-fucsia/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">
          {titulo}
        </p>
        <span className="text-sm font-medium text-esmeralda">
          Puntaje: {puntajeMostrado}/{totalMostrado}
        </span>
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
              <p className="font-medium">{resolverEtiqueta(ev.codigoCondicion)}</p>
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
