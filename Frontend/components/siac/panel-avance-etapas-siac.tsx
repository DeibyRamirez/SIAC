'use client'

import { useMemo } from 'react'
import { CheckCircle2, Clock, AlertTriangle, CircleDashed } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import type { Programa } from '@/lib/tipos'
import { CATALOGO_TRAMITES_SIAC } from '@/lib/utilidades/catalogo-tramites-siac'
import { itemsSelectProgramas } from '@/lib/utilidades-siac'

interface PanelAvanceEtapasSIACProps {
  programas: Programa[]
  programaId: string | null
  onCambiarPrograma: (id: string) => void
  progreso: ProgresoProcesoSIAC | null
  cargando?: boolean
}

function estadoDocumento(doc: ProgresoProcesoSIAC['documentos'][0]) {
  if (doc.aceptado) return 'Completada'
  if (doc.conObservaciones || doc.rechazado) return 'ConObservaciones'
  if (doc.porcentajeInterno > 0) return 'EnProgreso'
  return 'Pendiente'
}

function varianteBadge(
  estado: string,
): 'default' | 'secondary' | 'cyan' | 'destructive' | 'esmeralda' {
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

export function PanelAvanceEtapasSIAC({
  programas,
  programaId,
  onCambiarPrograma,
  progreso,
  cargando,
}: PanelAvanceEtapasSIACProps) {
  const tramiteNombre = progreso
    ? CATALOGO_TRAMITES_SIAC.find((t) => t.tipo === progreso.tipoTramite)?.nombre
    : null

  const opcionesPrograma = useMemo(
    () => itemsSelectProgramas(programas),
    [programas],
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Avance ponderado por carrera según documentos guía del trámite activo.
          </p>
          <Select
            value={programaId ?? ''}
            items={opcionesPrograma}
            onValueChange={(valor) => {
              if (valor) onCambiarPrograma(valor)
            }}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Seleccione un programa" />
            </SelectTrigger>
            <SelectContent>
              {opcionesPrograma.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!programaId && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Seleccione una carrera para ver el avance de su proceso SIAC.
          </p>
        )}

        {programaId && cargando && (
          <p className="text-sm text-muted-foreground">Calculando avance del proceso…</p>
        )}

        {programaId && progreso && !cargando && (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">
                Trámite: <span className="font-bold">{tramiteNombre}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {progreso.documentosAceptados} de {progreso.documentosTotal} documentos
                aceptados ({progreso.avanceGlobal}% de avance global).
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Cada documento guía aporta un peso igual al 100% del trámite. El porcentaje
                interno refleja la revisión del revisor (condiciones del documento maestro).
              </p>
            </div>

            <div className="space-y-3">
              {progreso.documentos.map((doc) => {
                const estado = estadoDocumento(doc)
                return (
                  <div
                    key={doc.codigoGuia}
                    className={`space-y-2 rounded-lg border p-4 ${
                      estado === 'EnProgreso' || estado === 'ConObservaciones'
                        ? 'border-cyan-tecnico/40 bg-cyan-tecnico/5'
                        : estado === 'Completada'
                          ? 'border-esmeralda/30 bg-esmeralda/5'
                          : 'border-border bg-muted/20 opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <IconoEstado estado={estado} />
                        <p className="truncate text-sm font-semibold text-primary">
                          {doc.codigoGuia}: {doc.nombre}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.puntaje !== null &&
                          doc.puntaje !== undefined &&
                          doc.totalCondiciones && (
                            <Badge variant="secondary">
                              {doc.puntaje}/{doc.totalCondiciones}
                            </Badge>
                          )}
                        <Badge variant={varianteBadge(estado)}>{etiquetaEstado(estado)}</Badge>
                      </div>
                    </div>
                    <Progress value={doc.aportacion}>
                      <ProgressLabel className="text-xs text-muted-foreground">
                        Aportación al proceso ({doc.peso}% peso · {doc.porcentajeInterno}%
                        interno)
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>
                    <p className="text-xs text-muted-foreground">
                      Aporta {doc.aportacion}% al avance global del programa
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
