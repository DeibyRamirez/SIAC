'use client'

import { useEffect, useState } from 'react'
import { Download, Eye, FileText, MoreHorizontal } from 'lucide-react'

import { ModalVisualizadorDocumento } from '@/components/siac/modal-visualizador-documento'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import { obtenerUrlDescargaPlantillaApi } from '@/lib/servicios/plantillas.servicio'
import type { Plantilla } from '@/lib/tipos'

interface RejillaPlantillasProps {
  plantillas: Plantilla[]
  onEditar?: (plantilla: Plantilla) => void
  onEliminar?: (id: string) => void
}

export function RejillaPlantillas({ plantillas, onEditar, onEliminar }: RejillaPlantillasProps) {
  const [plantillaActiva, setPlantillaActiva] = useState<Plantilla | null>(null)
  const [urlDescargaActiva, setUrlDescargaActiva] = useState<string | undefined>()

  useEffect(() => {
    if (!plantillaActiva || !apiDisponible()) {
      setUrlDescargaActiva(undefined)
      return
    }
    obtenerUrlDescargaPlantillaApi(plantillaActiva.id)
      .then((respuesta) => setUrlDescargaActiva(respuesta.url))
      .catch(() => setUrlDescargaActiva(undefined))
  }, [plantillaActiva])

  if (plantillas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
        No hay plantillas en esta categoría.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plantillas.map((plantilla) => (
          <Card key={plantilla.id}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start justify-between">
                <div className="flex h-24 flex-1 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-10 text-muted-foreground/40" />
                </div>
                <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="cyan">{plantilla.formato}</Badge>
                  {plantilla.esGuiaDocumentoMaestro && (
                    <Badge variant="secondary" className="text-[10px]">
                      Documento Maestro
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold text-primary">{plantilla.nombre}</p>
                {plantilla.tipoTramite && plantilla.tipoTramite !== 'General' && (
                  <p className="text-[11px] text-muted-foreground">
                    {plantilla.tipoTramite === 'Renovacion'
                      ? 'Renovación'
                      : 'Nuevo programa'}
                  </p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {plantilla.descripcion ?? plantilla.factor}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Versión {plantilla.version}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-esmeralda hover:underline"
                  >
                    <Download className="size-3" />
                    Descargar
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-cyan-tecnico hover:underline"
                    aria-label={`Visualizador de ${plantilla.nombre}`}
                    onClick={() => setPlantillaActiva(plantilla)}
                  >
                    <Eye className="size-3" />
                    Visualizador
                  </button>
                </div>
                {(onEditar || onEliminar) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button size="icon" variant="ghost" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {onEditar && (
                        <DropdownMenuItem onClick={() => onEditar(plantilla)}>
                          Editar plantilla
                        </DropdownMenuItem>
                      )}
                      {onEliminar && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onEliminar(plantilla.id)}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plantillaActiva && (
        <ModalVisualizadorDocumento
          abierto={Boolean(plantillaActiva)}
          onCerrar={() => setPlantillaActiva(null)}
          titulo={plantillaActiva.nombre}
          formato={plantillaActiva.formato}
          urlDocumento={urlDescargaActiva}
          plantillaId={plantillaActiva.id}
        />
      )}
    </>
  )
}
