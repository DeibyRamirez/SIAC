'use client'

import { useRouter } from 'next/navigation'
import { FileText, Trash2 } from 'lucide-react'

import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Evidencia } from '@/lib/tipos'
import { esNovedadCargador, formatearFecha, obtenerNombrePrograma } from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

interface TablaEvidenciasProps {
  evidencias: Evidencia[]
  enlaceDetalle?: (id: string) => string
  onEliminar?: (id: string) => void
  mostrarAccionesRapidas?: boolean
  onAprobar?: (id: string) => void
  onRechazar?: (id: string) => void
  mostrarNovedades?: boolean
}

export function TablaEvidencias({
  evidencias,
  enlaceDetalle,
  onEliminar,
  mostrarAccionesRapidas,
  onAprobar,
  onRechazar,
  mostrarNovedades,
}: TablaEvidenciasProps) {
  const router = useRouter()

  if (evidencias.length === 0) {
    return null
  }

  const tieneAcciones = Boolean(onEliminar || mostrarAccionesRapidas)

  return (
    <div className="tabla-institucional overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-primary/10 hover:bg-transparent">
            <TableHead>Documento</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Factor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            {tieneAcciones && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {evidencias.map((evidencia) => (
            <TableRow
              key={evidencia.id}
              className={cn(
                'border-primary/5',
                enlaceDetalle && 'cursor-pointer',
                evidencia.estado === 'Rechazado' && 'bg-fucsia/5',
              )}
              onClick={() => {
                if (enlaceDetalle) {
                  router.push(enlaceDetalle(evidencia.id))
                }
              }}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-tecnico/10 text-cyan-tecnico">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">{evidencia.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {evidencia.nombreArchivo}
                      {evidencia.version && evidencia.version > 1 && (
                        <span className="ml-1 text-cyan-tecnico">· v{evidencia.version}</span>
                      )}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {obtenerNombrePrograma(evidencia.programaId)}
              </TableCell>
              <TableCell className="text-sm">{evidencia.factor}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <InsigniaEstado estado={evidencia.estado} />
                  {mostrarNovedades && esNovedadCargador(evidencia) && (
                    <Badge variant="destructive" className="text-[10px]">
                      Requiere acción
                    </Badge>
                  )}
                  {evidencia.estado === 'Rechazado' && evidencia.observaciones && (
                    <Badge variant="destructive" className="text-[10px]">
                      Con observaciones
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatearFecha(evidencia.fechaCarga)}
              </TableCell>
              {tieneAcciones && (
                <TableCell className="text-right">
                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(evento) => evento.stopPropagation()}
                  >
                    {mostrarAccionesRapidas && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-esmeralda/30 text-esmeralda hover:bg-esmeralda/10"
                          onClick={() => onAprobar?.(evidencia.id)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-fucsia/30 text-fucsia hover:bg-fucsia/10"
                          onClick={() => onRechazar?.(evidencia.id)}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                    {onEliminar && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-coral hover:bg-coral/10"
                        onClick={() => onEliminar(evidencia.id)}
                        aria-label="Eliminar evidencia"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
