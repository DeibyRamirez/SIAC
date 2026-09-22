'use client'

import { Download } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { esUrlPdf } from '@/lib/constantes/documentos'
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
}

export function VisorDocumentoInline({
  titulo,
  urlDocumento,
  formato = 'PDF',
  className,
  claveCache,
}: VisorDocumentoInlineProps) {
  const urlBase = urlDocumento?.trim() ?? ''
  const urlEfectiva =
    urlBase && !esUrlFirmadaExterna(urlBase)
      ? `${urlBase}${urlBase.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(claveCache ?? Date.now()))}`
      : urlBase
  const claveIframe = `${urlBase}::${claveCache ?? ''}`
  const puedePrevisualizarPdf = Boolean(urlEfectiva) && esUrlPdf(urlBase)

  return (
    <div className={cn('flex min-h-[420px] flex-col overflow-hidden rounded-lg border', className)}>
      <header className="flex shrink-0 items-center justify-between gap-4 bg-zinc-800 px-4 py-2.5 text-white">
        <p className="truncate text-sm font-semibold">{titulo}</p>
        {urlBase && (
          <a
            href={urlEfectiva}
            download
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'text-white hover:bg-zinc-700 hover:text-white',
            )}
          >
            <Download className="size-4" />
            Descargar
          </a>
        )}
      </header>

      <div className="min-h-0 flex-1 bg-zinc-200">
        {puedePrevisualizarPdf ? (
          <iframe
            key={claveIframe}
            src={urlEfectiva}
            title={titulo}
            className="h-full min-h-[380px] w-full border-0 bg-zinc-100"
          />
        ) : (
          <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-md text-sm text-zinc-700">
              {urlBase
                ? `La vista previa en línea está disponible solo para documentos PDF. Descargue el archivo para abrirlo en ${formato === 'XLSX' ? 'Excel' : formato === 'DOCX' ? 'Word' : 'su aplicación'}.`
                : 'No hay un archivo asociado a esta evidencia todavía.'}
            </p>
            {urlBase && (
              <a
                href={urlEfectiva}
                download
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants())}
              >
                <Download className="size-4" />
                Descargar {formato}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
