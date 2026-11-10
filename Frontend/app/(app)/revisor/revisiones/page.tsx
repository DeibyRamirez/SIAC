'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { MoreVertical } from 'lucide-react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ControlesPaginacion } from '@/components/siac/controles-paginacion'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { PanelObservacionesRevision } from '@/components/siac/panel-observaciones-revision'
import { MensajeCargando } from '@/components/siac/estado-carga-lista'
import { EncabezadoPagina, PanelVacio } from '@/components/siac/tarjeta-acceso'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarMisRevisionesRevisorApi,
  type FilaRevisionRevisorApi,
} from '@/lib/servicios/evidencias.servicio'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
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

  function abrirObservaciones(fila: FilaRevisionRevisorApi) {
    setFilaSeleccionada(fila)
  }

  function cerrarDetalle() {
    setFilaSeleccionada(null)
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        etiqueta="Flujo de aprobación"
        titulo="Mis revisiones"
        descripcion="Historial de evidencias enviadas a revisión, incluyendo reenvíos tras corrección del profesor."
        accion={
          <Link href="/revisor/bandeja">
            <Button variant="outline">Ir a bandeja</Button>
          </Link>
        }
      />

      {cargando ? (
        <MensajeCargando texto="Cargando historial…" filas={6} columnas={7} />
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
                    <TableCell className="text-sm">
                      v{fila.numeroRevision ?? fila.version ?? 1}
                    </TableCell>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                size="icon"
                                variant="outline"
                                aria-label={`Acciones de la revisión de ${fila.nombre}`}
                              >
                                <MoreVertical className="size-4" aria-hidden />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" sideOffset={6}>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => abrirObservaciones(fila)}
                            >
                              Observaciones
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              nativeButton={false}
                              render={
                                <Link
                                  href={`/revisor/revisiones/${fila.evidenciaId}/versiones`}
                                />
                              }
                            >
                              Historial de versiones
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          if (!abierto) cerrarDetalle()
        }}
      >
        <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl">
          {filaSeleccionada ? (
            <PanelObservacionesRevision
              key={`obs-${filaSeleccionada.evidenciaId}-${filaSeleccionada.fechaEnvioRevision}`}
              fila={filaSeleccionada}
              onCerrar={cerrarDetalle}
              rutaHistorial={`/revisor/revisiones/${filaSeleccionada.evidenciaId}/versiones`}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
