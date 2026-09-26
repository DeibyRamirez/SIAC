'use client'

import { useCallback } from 'react'
import { Download } from 'lucide-react'

import { VisorDocxPreview } from '@/components/siac/visor-docx-preview'
import { Button, buttonVariants } from '@/components/ui/button'
import { esUrlPdf } from '@/lib/constantes/documentos'
import {
  obtenerBlobDocxEvidenciaApi,
  obtenerContenidoEvidenciaApi,
  obtenerContenidoPlantillaApi,
} from '@/lib/servicios/descarga-binaria'
import { cn } from '@/lib/utils'

/** Las URLs firmadas de S3/Supabase no admiten parámetros extra (rompen la firma). */
function esUrlFirmadaExterna(url: string): boolean {
  return /X-Amz-Signature=|X-Amz-Algorithm=|token=/i.test(url)
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

  const descargarDocxBinario = useCallback(async () => {
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
      <header className="flex shrink-0 items-center justify-between gap-4 bg-zinc-800 px-4 py-2.5 text-white">
        <p className="truncate text-sm font-semibold">{titulo}</p>
        {(urlBase || usarPreviewDocx) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-zinc-700 hover:text-white"
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
            <Download className="size-4" />
            Descargar
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-200">
        {usarPreviewDocx ? (
          <VisorDocxPreview
            cargarDocumento={cargarDocx}
            claveRecarga={`${evidenciaId ?? plantillaId}-${claveCache ?? ''}`}
            className="h-full min-h-0"
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
      </div>
    </div>
  )
}
