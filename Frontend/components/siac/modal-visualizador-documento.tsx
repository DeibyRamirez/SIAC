'use client'

import { Download, X } from 'lucide-react'

import { VisorDocumentoInline } from '@/components/siac/visor-documento-inline'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Plantilla } from '@/lib/tipos'

interface ModalVisualizadorDocumentoProps {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  formato: Plantilla['formato']
  urlDocumento?: string
  plantillaId?: string
}

export function ModalVisualizadorDocumento({
  abierto,
  onCerrar,
  titulo,
  formato,
  urlDocumento,
  plantillaId,
}: ModalVisualizadorDocumentoProps) {
  const urlEfectiva = urlDocumento?.trim() ?? ''

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-[95vw]"
      >
        <DialogTitle className="sr-only">{titulo}</DialogTitle>
        <DialogDescription className="sr-only">
          Visor de documento {formato}
        </DialogDescription>

        <header className="flex shrink-0 items-center justify-between gap-4 bg-zinc-800 px-4 py-3 text-white">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <div className="flex shrink-0 items-center gap-2">
            {urlEfectiva && (
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-zinc-700 hover:text-white"
              onClick={onCerrar}
            >
              Cerrar
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 bg-zinc-200">
          {plantillaId && formato === 'DOCX' ? (
            <VisorDocumentoInline
              titulo={titulo}
              urlDocumento={urlEfectiva}
              formato="DOCX"
              plantillaId={plantillaId}
              variant="fill"
              className="h-full min-h-0 rounded-none border-0"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-sm text-zinc-700">
                {urlEfectiva
                  ? 'Descargue el archivo para abrirlo.'
                  : 'No hay un archivo asociado a esta plantilla todavía.'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
