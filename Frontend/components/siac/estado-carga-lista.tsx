'use client'

import { AlertCircle, RotateCw } from 'lucide-react'

import { EsqueletoTabla } from '@/components/siac/esqueletos'

import { Button } from '@/components/ui/button'

/** Región accesible de carga: el texto lo anuncian los lectores; los hijos son el esqueleto visual. */
export function RegionCarga({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{texto}</span>
      {children}
    </div>
  )
}

/** Carga de una lista: esqueleto de tabla con la misma forma que la lista (texto solo para lectores). */
export function MensajeCargando({ texto, filas = 6, columnas = 5 }: { texto: string; filas?: number; columnas?: number }) {
  return (
    <RegionCarga texto={texto}>
      <EsqueletoTabla filas={filas} columnas={columnas} />
    </RegionCarga>
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
