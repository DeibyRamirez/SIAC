'use client'

import { Download, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { esUrlPdf } from '@/lib/constantes/documentos'
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
}

export function ModalVisualizadorDocumento({
  abierto,
  onCerrar,
  titulo,
  formato,
  urlDocumento,
}: ModalVisualizadorDocumentoProps) {
  const urlEfectiva = urlDocumento?.trim() ?? ''
  const puedePrevisualizarPdf = Boolean(urlEfectiva) && esUrlPdf(urlEfectiva)

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
          {puedePrevisualizarPdf ? (
            <iframe
              src={urlEfectiva}
              title={titulo}
              className="h-full w-full border-0 bg-zinc-100"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-sm text-zinc-700">
                La vista previa en línea está disponible solo para documentos PDF. Descargue el
                formato para abrirlo en {formato === 'XLSX' ? 'Excel' : 'Word'}.
              </p>
              {urlEfectiva ? (
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
              ) : (
                <p className="text-xs text-zinc-500">
                  No hay un archivo asociado a esta plantilla todavía.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
