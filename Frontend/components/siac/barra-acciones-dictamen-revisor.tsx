'use client'

import Link from 'next/link'
import { ArrowLeft, CircleCheck, MessageSquareWarning } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface BarraAccionesDictamenRevisorProps {
  etiquetaCumple: string
  etiquetaObservaciones: string
  onCumple: () => void
  onObservaciones: () => void
  deshabilitarCumple: boolean
  deshabilitarObservaciones: boolean
  procesando: boolean
  puedeDictaminar: boolean
  pistaDeshabilitado?: string
  rutaVolver?: string
}

export function BarraAccionesDictamenRevisor({
  etiquetaCumple,
  etiquetaObservaciones,
  onCumple,
  onObservaciones,
  deshabilitarCumple,
  deshabilitarObservaciones,
  procesando,
  puedeDictaminar,
  pistaDeshabilitado,
  rutaVolver = '/revisor/bandeja',
}: BarraAccionesDictamenRevisorProps) {
  const accionesInactivas = !puedeDictaminar || procesando

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-1 rounded-xl border border-primary/10 bg-muted/30 p-3 backdrop-blur-sm sm:static sm:mx-0 sm:p-4',
      )}
      aria-busy={procesando}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          disabled={accionesInactivas || deshabilitarCumple}
          onClick={onCumple}
          className="min-h-11 w-full border-transparent bg-esmeralda text-white shadow-sm hover:bg-esmeralda/90"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          {etiquetaCumple}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={accionesInactivas || deshabilitarObservaciones}
          onClick={onObservaciones}
          className="min-h-11 w-full border-coral text-coral hover:bg-coral/10 hover:text-coral"
        >
          <MessageSquareWarning className="size-4 shrink-0" aria-hidden />
          {etiquetaObservaciones}
        </Button>
      </div>

      {pistaDeshabilitado ? (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {pistaDeshabilitado}
        </p>
      ) : null}

      <div className="mt-3 border-t border-primary/10 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-10 w-full justify-center gap-2 sm:w-auto sm:justify-start"
          render={<Link href={rutaVolver} />}
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Volver
        </Button>
      </div>
    </div>
  )
}
