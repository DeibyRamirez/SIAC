'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DialogoConfirmacionProps {
  abierto: boolean
  titulo: string
  descripcion: string
  etiquetaConfirmar?: string
  etiquetaCancelar?: string
  variant?: 'default' | 'destructive'
  cargando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function DialogoConfirmacion({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar = 'Sí, continuar',
  etiquetaCancelar = 'No, cancelar',
  variant = 'default',
  cargando = false,
  onConfirmar,
  onCancelar,
}: DialogoConfirmacionProps) {
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancelar} disabled={cargando}>
            {etiquetaCancelar}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? 'Procesando…' : etiquetaConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
