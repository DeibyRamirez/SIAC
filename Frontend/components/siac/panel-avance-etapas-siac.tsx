'use client'

import { CheckCircle2, Clock, AlertTriangle, CircleDashed } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import {
  etiquetaEstadoEtapa,
  type AvanceEtapaSIAC,
  type EstadoEtapaSIAC,
  type ResumenAvanceEtapasSIAC,
} from '@/lib/utilidades/avance-etapas-siac'

interface PanelAvanceEtapasSIACProps {
  resumen: ResumenAvanceEtapasSIAC
}

function varianteBadge(
  estado: EstadoEtapaSIAC,
): 'default' | 'secondary' | 'cyan' | 'destructive' | 'esmeralda' {
  switch (estado) {
    case 'Completada':
      return 'esmeralda'
    case 'EnCurso':
      return 'default'
    case 'ConObservaciones':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function IconoEstado({ estado }: { estado: EstadoEtapaSIAC }) {
  switch (estado) {
    case 'Completada':
      return <CheckCircle2 className="size-4 text-esmeralda" />
    case 'EnCurso':
      return <Clock className="size-4 text-cyan-tecnico" />
    case 'ConObservaciones':
      return <AlertTriangle className="size-4 text-coral" />
    default:
      return <CircleDashed className="size-4 text-muted-foreground" />
  }
}

function FilaEtapa({ avance }: { avance: AvanceEtapaSIAC }) {
  return (
    <div
      className={`space-y-2 rounded-lg border p-4 ${
        avance.estado === 'EnCurso' || avance.estado === 'ConObservaciones'
          ? 'border-cyan-tecnico/40 bg-cyan-tecnico/5'
          : avance.estado === 'Completada'
            ? 'border-esmeralda/30 bg-esmeralda/5'
            : 'border-border bg-muted/20 opacity-75'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <IconoEstado estado={avance.estado} />
          <p className="truncate text-sm font-semibold text-primary">{avance.etapa.nombre}</p>
        </div>
        <Badge variant={varianteBadge(avance.estado)}>{etiquetaEstadoEtapa(avance.estado)}</Badge>
      </div>

      <Progress value={avance.progreso}>
        <ProgressLabel className="text-xs text-muted-foreground">Avance</ProgressLabel>
        <ProgressValue />
      </Progress>

      <p className="text-xs text-muted-foreground">
        {avance.documentosAceptados} de {avance.totalDocumentos} documentos aceptados
        {avance.totalDocumentos === 0 && ' · Sin documentos configurados'}
      </p>
    </div>
  )
}

export function PanelAvanceEtapasSIAC({ resumen }: PanelAvanceEtapasSIACProps) {
  const etapaActualAvance = resumen.etapas.find(
    (e) => e.estado === 'EnCurso' || e.estado === 'ConObservaciones',
  )

  return (
    <Card className="tarjeta-institucional">
      <CardHeader className="pb-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-esmeralda uppercase">
          Decreto 1330 de 2019
        </p>
        <CardTitle className="text-lg">Estado del proceso SIAC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {resumen.etapaActual && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">
              Etapa actual:{' '}
              <span className="font-bold">{resumen.etapaActual.nombre}</span>
            </p>
            {etapaActualAvance && (
              <p className="mt-1 text-sm text-muted-foreground">
                {etapaActualAvance.documentosAceptados} de {etapaActualAvance.totalDocumentos}{' '}
                documentos aceptados en esta etapa ({etapaActualAvance.progreso}% de avance).
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Las etapas anteriores deben estar completas con todos sus documentos en estado
              aceptado (Validado).
            </p>
          </div>
        )}

        <div className="space-y-3">
          {resumen.etapas.map((avance) => (
            <FilaEtapa key={avance.etapa.id} avance={avance} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
