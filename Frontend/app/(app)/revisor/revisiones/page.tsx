'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { ResumenObservacionesPorCondicion } from '@/components/siac/resumen-observaciones-por-condicion'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarMisRevisionesRevisorApi,
  obtenerEvaluacionesCondicionApi,
  type FilaRevisionRevisorApi,
} from '@/lib/servicios/evidencias.servicio'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import type { EvaluacionCondicionEvidencia } from '@/lib/condiciones-documento-maestro'
import { formatearFechaHora, formatearPuntaje } from '@/lib/utilidades-siac'

export default function MisRevisionesRevisorPage() {
  return (
    <PlantillaPaginaApp titulo="Mis revisiones" rol="Revisor">
      <ContenidoMisRevisiones />
    </PlantillaPaginaApp>
  )
}

function ContenidoMisRevisiones() {
  const [filas, setFilas] = useState<FilaRevisionRevisorApi[]>([])
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaRevisionRevisorApi | null>(null)
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCondicionEvidencia[]>([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      if (!apiDisponible()) {
        setFilas([])
        setTotal(0)
        return
      }
      const resp = await listarMisRevisionesRevisorApi(pagina, LIMITE_FILAS_TABLA)
      setFilas(resp.datos)
      setTotal(resp.total)
    } finally {
      setCargando(false)
    }
  }, [pagina])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function abrirDetalle(fila: FilaRevisionRevisorApi) {
    setFilaSeleccionada(fila)
    setEvaluaciones([])
    setCargandoDetalle(true)
    try {
      if (apiDisponible() && fila.numeroRevision) {
        const evals = await obtenerEvaluacionesCondicionApi(
          fila.evidenciaId,
          fila.numeroRevision,
        )
        setEvaluaciones(
          evals.map((e) => ({
            codigoCondicion: e.codigoCondicion,
            cumple: e.cumple,
            observacion: e.observacion,
            numeroRevision: e.numeroRevision,
          })),
        )
      }
    } finally {
      setCargandoDetalle(false)
    }
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Flujo de aprobación"
        titulo="Mis revisiones"
        descripcion="Historial de evidencias enviadas a revisión, incluyendo reenvíos tras corrección del cargador."
        accion={
          <Link href="/revisor/bandeja">
            <Button variant="outline">Ir a bandeja</Button>
          </Link>
        }
      />

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando historial…</p>
      ) : filas.length === 0 ? (
        <PanelVacio mensaje="Aún no hay envíos a revisión registrados." />
      ) : (
        <>
          <div className="tabla-institucional overflow-x-auto rounded-xl border border-primary/10">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/10 hover:bg-transparent">
                  <TableHead>Programa / Institución</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila) => (
                  <TableRow
                    key={`${fila.evidenciaId}-${fila.fechaEnvioRevision}`}
                    className="border-primary/5"
                  >
                    <TableCell className="text-sm">
                      {fila.programa?.nombre ?? 'Institución'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-primary">{fila.nombre}</span>
                        <Badge
                          variant={fila.tipoEnvio === 'correccion' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {fila.tipoEnvio === 'correccion' ? 'Reenvío' : 'Inicial'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">v{fila.numeroRevision ?? fila.version ?? 1}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatearFechaHora(fila.fechaEnvioRevision)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatearPuntaje(fila.puntaje, fila.totalCondiciones) ?? '—'}
                    </TableCell>
                    <TableCell>
                      <InsigniaEstado estado={fila.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDetalle(fila)}
                        >
                          Ver observaciones
                        </Button>
                        {fila.estado === 'EnRevision' && (
                          <Link href={`/revisor/bandeja/${fila.evidenciaId}`}>
                            <Button size="sm">Revisar</Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ControlesPaginacion
            pagina={pagina}
            total={total}
            limite={LIMITE_FILAS_TABLA}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      <Sheet
        open={filaSeleccionada !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setFilaSeleccionada(null)
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {filaSeleccionada && (
            <>
              <SheetHeader>
                <SheetTitle>{filaSeleccionada.nombre}</SheetTitle>
                <SheetDescription>
                  Versión {filaSeleccionada.numeroRevision} ·{' '}
                  {formatearFechaHora(filaSeleccionada.fechaEnvioRevision)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {cargandoDetalle ? (
                  <p className="text-sm text-muted-foreground">Cargando observaciones…</p>
                ) : evaluaciones.length > 0 ? (
                  <ResumenObservacionesPorCondicion
                    evaluaciones={evaluaciones}
                    puntaje={filaSeleccionada.puntaje}
                    totalCondiciones={filaSeleccionada.totalCondiciones}
                  />
                ) : filaSeleccionada.observacionesDictamen ? (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">Observaciones del dictamen</span>
                    <Textarea
                      value={filaSeleccionada.observacionesDictamen}
                      readOnly
                      disabled
                      className="min-h-32 resize-none bg-muted/50"
                    />
                  </label>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin observaciones registradas para esta versión.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
