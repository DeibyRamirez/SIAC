'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { Download, GitCompare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { VisorDocxPreview } from '@/components/siac/visor-docx-preview'
import { Button, buttonVariants } from '@/components/ui/button'
import { esUrlPdf } from '@/lib/constantes/documentos'
import {
  obtenerBlobDocxEvidenciaApi,
  obtenerContenidoEvidenciaApi,
  obtenerContenidoPlantillaApi,
} from '@/lib/servicios/descarga-binaria'
import { cn } from '@/lib/utils'
import type { LineaAnotacion } from '@/lib/utilidades/anotar-diff-docx'
import type { SeleccionDocx } from '@/lib/utilidades/seleccion-docx'

/** Las URLs firmadas de S3/Supabase no admiten parámetros extra (rompen la firma). */
function esUrlFirmadaExterna(url: string): boolean {
  return /X-Amz-Signature=|X-Amz-Algorithm=|token=/i.test(url)
}

interface ModoCambios {
  activo: boolean
  onToggle: () => void
  etiquetaActiva?: string
  etiquetaInactiva?: string
  deshabilitado?: boolean
}

interface VisorDocumentoInlineProps {
  titulo: string
  urlDocumento?: string
  formato?: 'PDF' | 'DOCX' | 'XLSX'
  className?: string
  claveCache?: string | number
  evidenciaId?: string
  versionDocumento?: number
  plantillaId?: string
  /** inline: marco fijo con scroll; fill: ocupa el alto del contenedor padre (p. ej. modal). */
  variant?: 'inline' | 'fill'
  /** Oculta el encabezado interno del visor (útil en modales a pantalla completa). */
  ocultarEncabezado?: boolean
  /** Toggle "Ver/Ocultar cambios" en el header del propio card del visor. */
  modoCambios?: ModoCambios
  /** Cambios a superponer inline sobre el preview con formato (no lo reemplaza). */
  anotacionesCambios?: LineaAnotacion[]
  /** Pie inferior del card en modo cambios (p. ej. chips de imágenes). */
  pieCambios?: ReactNode
  /** Habilita el control "Comentar" al seleccionar texto en el preview limpio. */
  onComentarSeleccion?: (seleccion: SeleccionDocx) => void
  /** Ancla/cita a resaltar/desplazar cuando se pulsa un comentario del panel. */
  anclaResaltada?: { anchor?: string; quote?: string; nonce: number }
}

export function VisorDocumentoInline({
  titulo,
  urlDocumento,
  formato = 'PDF',
  className,
  claveCache,
  evidenciaId,
  versionDocumento,
  plantillaId,
  variant = 'inline',
  ocultarEncabezado = false,
  modoCambios,
  anotacionesCambios,
  pieCambios,
  onComentarSeleccion,
  anclaResaltada,
}: VisorDocumentoInlineProps) {
  const urlBase = urlDocumento?.trim() ?? ''
  const urlEfectiva =
    urlBase && !esUrlFirmadaExterna(urlBase)
      ? `${urlBase}${urlBase.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(claveCache ?? Date.now()))}`
      : urlBase
  const claveIframe = `${urlBase}::${claveCache ?? ''}`
  const puedePrevisualizarPdf = Boolean(urlEfectiva) && esUrlPdf(urlBase)
  const usarPreviewDocx =
    formato === 'DOCX' && (evidenciaId !== undefined || plantillaId !== undefined)

  const cargarDocx = useCallback(async () => {
    if (evidenciaId) {
      return obtenerContenidoEvidenciaApi(evidenciaId, versionDocumento)
    }
    if (plantillaId) {
      return obtenerContenidoPlantillaApi(plantillaId)
    }
    throw new Error('Sin identificador de documento.')
  }, [evidenciaId, plantillaId, versionDocumento])

  const [descargando, setDescargando] = useState(false)

  const descargarDocxBinario = useCallback(async () => {
    setDescargando(true)
    try {
      let blob: Blob
      if (evidenciaId) {
        blob = await obtenerBlobDocxEvidenciaApi(evidenciaId, versionDocumento)
      } else if (plantillaId) {
        const buffer = await obtenerContenidoPlantillaApi(plantillaId)
        blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      } else {
        return
      }
      const nombreArchivo = titulo.toLowerCase().endsWith('.docx')
        ? titulo
        : `${titulo}.docx`
      const enlace = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = enlace
      anchor.download = nombreArchivo
      anchor.click()
      URL.revokeObjectURL(enlace)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo preparar el documento para descarga.',
      )
    } finally {
      setDescargando(false)
    }
  }, [evidenciaId, plantillaId, versionDocumento, titulo])

  const shellAltura =
    variant === 'fill'
      ? 'h-full min-h-0 max-h-none'
      : 'h-[560px] max-h-[70vh] min-h-[360px] sm:min-h-[420px]'

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border',
        shellAltura,
        className,
      )}
    >
      {!ocultarEncabezado ? (
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-zinc-800 px-4 py-2.5 text-white">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{titulo}</p>
          <div className="flex items-center gap-2">
            {modoCambios && (
              <Button
                type="button"
                size="sm"
                variant={modoCambios.activo ? 'secondary' : 'ghost'}
                aria-pressed={modoCambios.activo}
                disabled={modoCambios.deshabilitado}
                className={cn(
                  !modoCambios.activo &&
                    'text-white hover:bg-zinc-700 hover:text-white',
                )}
                onClick={modoCambios.onToggle}
              >
                <GitCompare className="size-4" />
                {modoCambios.activo
                  ? (modoCambios.etiquetaActiva ?? 'Ocultar cambios')
                  : (modoCambios.etiquetaInactiva ?? 'Ver cambios')}
              </Button>
            )}
            {(urlBase || usarPreviewDocx) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-white hover:bg-zinc-700 hover:text-white"
                disabled={usarPreviewDocx && descargando}
                onClick={() => {
                  if (usarPreviewDocx) {
                    void descargarDocxBinario()
                    return
                  }
                  if (urlEfectiva) {
                    window.open(urlEfectiva, '_blank', 'noopener,noreferrer')
                  }
                }}
              >
                {usarPreviewDocx && descargando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {usarPreviewDocx && descargando ? 'Preparando…' : 'Descargar'}
              </Button>
            )}
          </div>
        </header>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-200">
        {usarPreviewDocx ? (
          <VisorDocxPreview
            cargarDocumento={cargarDocx}
            claveRecarga={`${evidenciaId ?? plantillaId}-${claveCache ?? ''}`}
            className="h-full min-h-0"
            permitirSeleccion={Boolean(onComentarSeleccion)}
            onComentarSeleccion={onComentarSeleccion}
            anclaResaltada={anclaResaltada}
            anotaciones={modoCambios?.activo ? anotacionesCambios : undefined}
          />
        ) : puedePrevisualizarPdf ? (
          <iframe
            key={claveIframe}
            src={urlEfectiva}
            title={titulo}
            className="h-full min-h-0 w-full border-0 bg-zinc-100"
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-md text-sm text-zinc-700">
              {urlBase
                ? `Descargue el archivo para abrirlo en ${formato === 'XLSX' ? 'Excel' : formato === 'DOCX' ? 'Word' : 'su aplicación'}.`
                : 'No hay un archivo asociado a esta evidencia todavía.'}
            </p>
            {urlBase && (
              <Button
                type="button"
                onClick={() => {
                  if (usarPreviewDocx) {
                    void descargarDocxBinario()
                    return
                  }
                  window.open(urlEfectiva, '_blank', 'noopener,noreferrer')
                }}
              >
                <Download className="size-4" />
                Descargar {formato}
              </Button>
            )}
          </div>
        )}
        {usarPreviewDocx && descargando && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 text-sm font-medium text-primary">
              <Loader2 className="size-6 animate-spin" />
              Preparando documento…
            </div>
          </div>
        )}
      </div>

      {modoCambios?.activo && pieCambios && (
        <div className="shrink-0 border-t bg-white px-4 py-2">{pieCambios}</div>
      )}
    </div>
  )
}
