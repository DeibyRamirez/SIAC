'use client'

import { Download, GitCompare, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { etiquetaRol } from '@/lib/auth-mock'
import type { EvidenciaVersionApi } from '@/lib/servicios/evidencias.servicio'
import { formatearFechaHora } from '@/lib/utilidades-siac'
import { cn } from '@/lib/utils'

interface PropsListaVersionesEvidencia {
  versiones: EvidenciaVersionApi[]
  versionActiva: number
  seleccionada: number
  onSeleccionar: (version: EvidenciaVersionApi) => void
  onDescargar: (version: EvidenciaVersionApi) => void
  onVerCambios: (version: EvidenciaVersionApi) => void
  descargandoNumero?: number | null
}

/** Tarjetas de versiones para la pantalla de historial: texto y acciones sin apretarse. */
export function ListaVersionesEvidencia({
  versiones,
  versionActiva,
  seleccionada,
  onSeleccionar,
  onDescargar,
  onVerCambios,
  descargandoNumero = null,
}: PropsListaVersionesEvidencia) {
  return (
    <div className="space-y-3">
      {versiones.map((version) => {
        const activa = versionActiva === version.numero
        const elegida = seleccionada === version.numero
        return (
          <div
            key={version.id}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              elegida
                ? 'border-primary bg-accent/40 ring-1 ring-primary/20'
                : 'border-border bg-white',
            )}
          >
            <button
              type="button"
              className="w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-pressed={elegida}
              aria-label={`Ver versión ${version.numero} de ${version.nombreArchivo}`}
              onClick={() => onSeleccionar(version)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-primary">v{version.numero}</span>
                <Badge variant={activa ? 'secondary' : 'outline'}>
                  {activa ? 'Activa' : 'Anterior'}
                </Badge>
                {version.subidoPorRol === 'Revisor' ? (
                  <Badge variant="outline" className="border-fucsia/30 text-fucsia">
                    Subida por revisor
                  </Badge>
                ) : null}
              </div>
              <p
                className="mt-2 line-clamp-2 break-words text-sm font-medium text-primary"
                title={version.nombreArchivo}
              >
                {version.nombreArchivo}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {version.subidoPor?.nombre ?? 'Usuario'}
                {version.subidoPorRol
                  ? ` · ${etiquetaRol(version.subidoPorRol)}`
                  : ''}
              </p>
              <p className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                {formatearFechaHora(version.createdAt)}
              </p>
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              {version.numero > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={`Ver cambios de v${version.numero - 1} a v${version.numero}`}
                  onClick={() => onVerCambios(version)}
                >
                  <GitCompare className="size-4" aria-hidden />
                  Ver cambios
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Descargar versión ${version.numero}`}
                disabled={descargandoNumero !== null}
                onClick={() => onDescargar(version)}
              >
                {descargandoNumero === version.numero ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                {descargandoNumero === version.numero ? 'Preparando…' : 'Descargar'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
