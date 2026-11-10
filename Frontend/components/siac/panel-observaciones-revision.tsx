'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { History } from 'lucide-react'

import { EsqueletoFilas } from '@/components/siac/esqueletos'
import { InsigniaEstado } from '@/components/siac/insignia-estado'
import { ObservacionesPorVersion } from '@/components/siac/observaciones-por-version'
import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { obtenerEvidenciaApi, type FilaRevisionRevisorApi } from '@/lib/servicios/evidencias.servicio'
import type { Evidencia } from '@/lib/tipos'
import {
  esDocumentoAprobado,
  formatoVisorDesdeArchivo,
  formatearFechaHora,
  mapearEvidenciaDesdeApi,
} from '@/lib/utilidades-siac'

interface PropsPanelObservacionesRevision {
  fila: FilaRevisionRevisorApi
  onCerrar: () => void
  /** Ruta a la pantalla propia de historial, disponible en todos los estados. */
  rutaHistorial: string
}

/** Consulta read-only: resumen, observaciones y acceso al historial. */
export function PanelObservacionesRevision({
  fila,
  onCerrar,
  rutaHistorial,
}: PropsPanelObservacionesRevision) {
  const [evidenciaActual, setEvidenciaActual] = useState<Evidencia | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    obtenerEvidenciaApi(fila.evidenciaId)
      .then((evidencia) => {
        if (activo) setEvidenciaActual(mapearEvidenciaDesdeApi(evidencia))
      })
      .catch((err) => {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el documento vigente.',
          )
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [fila.evidenciaId])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="shrink-0 border-b border-primary/10 px-4 py-4 text-left">
        <SheetTitle className="pr-8 text-base leading-snug">
          {evidenciaActual?.nombre ?? 'Observaciones'}
        </SheetTitle>
        <SheetDescription className="text-xs">
          {evidenciaActual && esDocumentoAprobado(evidenciaActual.estado)
            ? 'Resumen de la evidencia y observaciones agrupadas por versión. El documento se consulta desde el historial.'
            : 'Consulta del último documento vigente. No modifica el dictamen ni los comentarios guardados.'}
        </SheetDescription>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {fila.programa?.nombre ?? 'Institución'}
          </span>
          <Badge variant="outline">Revisión #{fila.numeroRevision}</Badge>
          {evidenciaActual ? (
            <InsigniaEstado estado={evidenciaActual.estado} />
          ) : null}
          <span className="text-xs text-muted-foreground">
            Enviada {formatearFechaHora(fila.fechaEnvioRevision)}
          </span>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {cargando ? (
          <EsqueletoFilas filas={3} />
        ) : evidenciaActual ? (
          esDocumentoAprobado(evidenciaActual.estado) ? (
            <ObservacionesPorVersion
              evidenciaId={evidenciaActual.id}
              fila={fila}
              estadoActual={evidenciaActual.estado}
              versionActual={evidenciaActual.version ?? 1}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  Documento vigente v{evidenciaActual.version ?? 1}
                </Badge>
                <InsigniaEstado estado={evidenciaActual.estado} />
                <span className="text-xs text-muted-foreground">
                  {evidenciaActual.nombreArchivo}
                </span>
              </div>
              <div className="h-[420px] overflow-hidden rounded-lg border bg-white">
                <VisorDocumentoInline
                  titulo={evidenciaActual.nombreArchivo}
                  formato={formatoVisorDesdeArchivo(evidenciaActual.nombreArchivo)}
                  evidenciaId={evidenciaActual.id}
                  versionDocumento={evidenciaActual.version ?? 1}
                  claveCache={evidenciaActual.version ?? 1}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">
                  Observaciones del dictamen
                </p>
                <p className="whitespace-pre-line rounded-lg border bg-muted/30 px-3 py-3 text-sm">
                  {fila.observacionesDictamen?.trim() ||
                    'Esta revisión no tiene observaciones de texto guardadas.'}
                </p>
              </div>
            </>
          )
        ) : null}
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-primary/10 px-4 py-3">
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cerrar
        </Button>
        <Link
          href={rutaHistorial}
          className={cn(
            buttonVariants(),
            'text-primary-foreground hover:text-primary-foreground',
          )}
        >
          <span className="inline-flex items-center gap-1.5 text-primary-foreground">
            <History className="size-4" aria-hidden />
            Historial de versiones
          </span>
        </Link>
      </SheetFooter>
    </div>
  )
}
