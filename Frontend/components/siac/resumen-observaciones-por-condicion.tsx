'use client'

import { Check, X } from 'lucide-react'

import {
  etiquetaCondicion,
  type CodigoCondicionDocumentoMaestro,
} from '@/lib/condiciones-documento-maestro'

function etiquetaCondicionPrograma(codigo: string): string {
  return etiquetaCondicion(codigo as CodigoCondicionDocumentoMaestro)
}

export interface EvaluacionCondicionResumenItem {
  codigoCondicion: string
  cumple: boolean
  observacion?: string | null
  numeroRevision?: number
}

interface ResumenObservacionesPorCondicionProps {
  evaluaciones: EvaluacionCondicionResumenItem[]
  /** Puntaje entero n (condiciones que cumplen). */
  puntaje?: number | null
  /** Total de condiciones (9 en G1, 6 en G3). Por defecto, las evaluaciones recibidas. */
  totalCondiciones?: number | null
  titulo?: string
  resolverEtiqueta?: (codigo: string) => string
  /** Si true, solo lista condiciones que no cumplen. */
  soloFallos?: boolean
}

export function ResumenObservacionesPorCondicion({
  evaluaciones,
  puntaje,
  totalCondiciones,
  titulo = 'Evaluación por condiciones del documento',
  resolverEtiqueta = etiquetaCondicionPrograma,
  soloFallos = false,
}: ResumenObservacionesPorCondicionProps) {
  const lista = soloFallos ? evaluaciones.filter((ev) => !ev.cumple) : evaluaciones

  if (evaluaciones.length === 0) return null

  if (soloFallos && lista.length === 0) {
    return (
      <div className="tarjeta-institucional rounded-xl border border-primary/10 bg-card p-4 text-sm text-muted-foreground">
        Todas las condiciones evaluadas cumplen en esta versión.
      </div>
    )
  }

  const puntajeMostrado = puntaje ?? evaluaciones.filter((ev) => ev.cumple).length
  const totalMostrado = totalCondiciones ?? evaluaciones.length

  return (
    <div className="tarjeta-institucional rounded-xl border border-primary/10 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">{titulo}</p>
        <span className="text-sm font-medium text-esmeralda">
          Puntaje: {puntajeMostrado}/{totalMostrado}
        </span>
      </div>
      <ul className="space-y-2" aria-label="Condiciones evaluadas">
        {lista.map((ev) => (
          <li
            key={ev.codigoCondicion}
            className="flex gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
          >
            {ev.cumple ? (
              <Check className="mt-0.5 size-4 shrink-0 text-esmeralda" aria-hidden />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {resolverEtiqueta(ev.codigoCondicion)}
              </p>
              {!ev.cumple && ev.observacion ? (
                <p className="mt-0.5 text-muted-foreground">{ev.observacion}</p>
              ) : null}
              {!ev.cumple && !ev.observacion ? (
                <p className="mt-0.5 text-sm text-destructive/80">
                  Requiere corrección (sin comentario detallado).
                </p>
              ) : null}
              {ev.cumple ? (
                <p className="text-xs text-muted-foreground">Cumple la condición.</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
