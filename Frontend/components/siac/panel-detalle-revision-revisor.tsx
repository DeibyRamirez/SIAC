'use client'

import Link from 'next/link'
import { useState } from 'react'

import { InsigniaEstado } from '@/components/siac/insignia-estado'
import {
  ResumenObservacionesPorCondicion,
  type EvaluacionCondicionResumenItem,
} from '@/components/siac/resumen-observaciones-por-condicion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { FilaRevisionRevisorApi } from '@/lib/servicios/evidencias.servicio'
import { formatearFechaHora, formatearPuntaje } from '@/lib/utilidades-siac'

export type ModoDetalleRevisionRevisor = 'programa' | 'institucional' | 'texto' | 'vacio'

interface PanelDetalleRevisionRevisorProps {
  fila: FilaRevisionRevisorApi
  modo: ModoDetalleRevisionRevisor
  evaluaciones: EvaluacionCondicionResumenItem[]
  cargando: boolean
  resolverEtiqueta?: (codigo: string) => string
  tituloChecklist?: string
  onCerrar: () => void
}

function EsqueletoDetalle() {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Cargando observaciones">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-16 rounded-lg bg-muted" />
      <div className="h-16 rounded-lg bg-muted" />
    </div>
  )
}

export function PanelDetalleRevisionRevisor({
  fila,
  modo,
  evaluaciones,
  cargando,
  resolverEtiqueta,
  tituloChecklist = 'Evaluación por condiciones del documento',
  onCerrar,
}: PanelDetalleRevisionRevisorProps) {
  const [soloFallos, setSoloFallos] = useState(false)

  const puntajeTexto = formatearPuntaje(fila.puntaje, fila.totalCondiciones)
  const alcanceLabel = fila.programa?.nombre ?? 'Institución (IES)'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="shrink-0 border-b border-primary/10 px-4 py-4 text-left">
        <SheetTitle className="pr-8 text-base leading-snug">{fila.nombre}</SheetTitle>
        <SheetDescription className="text-xs">
          Versión {fila.numeroRevision ?? fila.version ?? 1} ·{' '}
          {formatearFechaHora(fila.fechaEnvioRevision)}
        </SheetDescription>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="max-w-full truncate text-xs text-muted-foreground">{alcanceLabel}</span>
          <InsigniaEstado estado={fila.estado} />
          <Badge
            variant={fila.tipoEnvio === 'correccion' ? 'destructive' : 'secondary'}
            className="text-[10px]"
          >
            {fila.tipoEnvio === 'correccion' ? 'Reenvío' : 'Envío inicial'}
          </Badge>
          {puntajeTexto ? (
            <Badge variant="outline" className="text-[10px] font-medium">
              Puntaje {puntajeTexto}
            </Badge>
          ) : null}
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {cargando ? (
          <EsqueletoDetalle />
        ) : modo === 'programa' || modo === 'institucional' ? (
          <div className="space-y-3">
            {evaluaciones.some((ev) => !ev.cumple) ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-input"
                  checked={soloFallos}
                  onChange={(e) => setSoloFallos(e.target.checked)}
                />
                Mostrar solo condiciones a mejorar
              </label>
            ) : null}
            <ResumenObservacionesPorCondicion
              evaluaciones={evaluaciones}
              puntaje={fila.puntaje}
              totalCondiciones={fila.totalCondiciones}
              titulo={tituloChecklist}
              resolverEtiqueta={resolverEtiqueta}
              soloFallos={soloFallos}
            />
          </div>
        ) : modo === 'texto' ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-primary">Observaciones del dictamen</span>
            <Textarea
              value={fila.observacionesDictamen ?? ''}
              readOnly
              disabled
              className="min-h-40 resize-none bg-muted/40"
            />
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin observaciones ni checklist registrados para esta versión.
          </p>
        )}
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-primary/10 px-4 py-3">
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cerrar
        </Button>
        {fila.estado === 'EnRevision' ? (
          <Button type="button" render={<Link href={`/revisor/bandeja/${fila.evidenciaId}`} />}>
            Abrir en bandeja
          </Button>
        ) : null}
      </SheetFooter>
    </div>
  )
}
