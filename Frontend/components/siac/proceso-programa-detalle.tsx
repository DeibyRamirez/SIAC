'use client'

import { CheckCircle2, CircleDashed, Clock, AlertTriangle } from 'lucide-react'

import { Semaforo } from '@/components/siac/insignia-estado'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import { CATALOGO_TRAMITES_SIAC } from '@/lib/utilidades/catalogo-tramites-siac'
import { calcularSemaforoAvance } from '@/lib/utilidades/vigencia-registro'

function semaforoDocumento(porcentajeInterno: number) {
  return calcularSemaforoAvance(porcentajeInterno)
}

function estadoDocumento(doc: ProgresoProcesoSIAC['documentos'][0]) {
  if (doc.aceptado) return 'Completada'
  if (doc.conObservaciones || doc.rechazado) return 'ConObservaciones'
  if (doc.porcentajeInterno > 0) return 'EnProgreso'
  return 'Pendiente'
}

function varianteBadge(estado: string): 'default' | 'secondary' | 'cyan' | 'destructive' | 'esmeralda' {
  switch (estado) {
    case 'Completada':
      return 'esmeralda'
    case 'EnProgreso':
      return 'default'
    case 'ConObservaciones':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case 'Completada':
      return 'Completado'
    case 'EnProgreso':
      return 'En progreso'
    case 'ConObservaciones':
      return 'Con observaciones'
    default:
      return 'Pendiente'
  }
}

function IconoEstado({ estado }: { estado: string }) {
  switch (estado) {
    case 'Completada':
      return <CheckCircle2 className="size-4 text-esmeralda" />
    case 'EnProgreso':
      return <Clock className="size-4 text-cyan-tecnico" />
    case 'ConObservaciones':
      return <AlertTriangle className="size-4 text-coral" />
    default:
      return <CircleDashed className="size-4 text-muted-foreground" />
  }
}

interface ProcesoProgramaDetalleProps {
  nombreEntidad: string
  progreso: ProgresoProcesoSIAC
  vigenciaActiva: boolean
}

export function ProcesoProgramaDetalle({
  nombreEntidad,
  progreso,
  vigenciaActiva,
}: ProcesoProgramaDetalleProps) {
  const tramiteNombre = CATALOGO_TRAMITES_SIAC.find((t) => t.tipo === progreso.tipoTramite)?.nombre
  const procesoCompleto = progreso.avanceGlobal >= 100

  return (
    <Card className="tarjeta-institucional">
      <CardHeader className="pb-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          Proceso SIAC
        </p>
        <CardTitle className="text-lg">{nombreEntidad}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {tramiteNombre ?? progreso.tipoTramite}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {progreso.documentos.map((doc) => {
            const estado = estadoDocumento(doc)
            const semaforo = semaforoDocumento(doc.porcentajeInterno)
            return (
              <div
                key={doc.codigoGuia}
                className={`space-y-2 rounded-lg border p-4 ${
                  estado === 'EnProgreso' || estado === 'ConObservaciones'
                    ? 'border-cyan-tecnico/40 bg-cyan-tecnico/5'
                    : estado === 'Completada'
                      ? 'border-esmeralda/30 bg-esmeralda/5'
                      : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <IconoEstado estado={estado} />
                    <p className="truncate text-sm font-semibold text-primary">
                      {doc.codigoGuia}
                    </p>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      — {doc.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-esmeralda">
                      {doc.porcentajeInterno}%
                    </span>
                    <Semaforo valor={semaforo} />
                    <Badge variant={varianteBadge(estado)}>{etiquetaEstado(estado)}</Badge>
                  </div>
                </div>
                <Progress value={doc.porcentajeInterno} className="h-2" />
                {doc.puntaje !== null && doc.totalCondiciones ? (
                  <p className="text-xs text-muted-foreground">
                    Puntaje: {doc.puntaje}/{doc.totalCondiciones} condiciones
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-primary/30 bg-accent/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-primary">Total del proceso</span>
            <span className="text-lg font-bold text-esmeralda">{progreso.avanceGlobal}%</span>
          </div>
          <Progress value={progreso.avanceGlobal} className="mt-2 h-3">
            <ProgressLabel className="sr-only">Avance global</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>

        {procesoCompleto && !vigenciaActiva ? (
          <p className="rounded-lg border border-esmeralda/30 bg-esmeralda/10 p-3 text-sm text-primary">
            Proceso documental completado. Pendiente activación de vigencia por el administrador.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
