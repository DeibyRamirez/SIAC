'use client'

import { AlertCircle, Loader2, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Aviso accesible mientras se pide una lista a la API. */
export function MensajeCargando({ texto }: { texto: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-white p-10 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {texto}
    </div>
  )
}

/** Error de carga con botón «Reintentar» que vuelve a pedir la lista. */
export function MensajeErrorCarga({
  mensaje,
  onReintentar,
}: {
  mensaje: string
  onReintentar?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-white p-8 text-center text-sm text-destructive"
    >
      <p className="flex items-center gap-2">
        <AlertCircle className="size-4" aria-hidden />
        {mensaje}
      </p>
      {onReintentar ? (
        <Button type="button" variant="outline" size="sm" onClick={onReintentar}>
          <RotateCw className="size-4" aria-hidden />
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
