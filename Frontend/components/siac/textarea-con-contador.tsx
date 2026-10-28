'use client'

import * as React from 'react'

import { Textarea } from '@/components/ui/textarea'
import { LIMITE_TEXTO_LARGO } from '@/lib/utilidades/limites-texto'
import { cn } from '@/lib/utils'

type PropsTextareaConContador = Omit<React.ComponentProps<typeof Textarea>, 'maxLength'> & {
  /** Máximo de caracteres; por defecto 600 (mismo límite que el backend). */
  limite?: number
}

/**
 * Campo de texto largo (observaciones, comentarios) con contador visible «n/600».
 * `maxLength` impide escribir de más; el backend valida el mismo límite con @MaxLength.
 */
export function TextareaConContador({
  limite = LIMITE_TEXTO_LARGO,
  value,
  className,
  id,
  ...props
}: PropsTextareaConContador) {
  const idGenerado = React.useId()
  const idContador = `${id ?? idGenerado}-contador`
  const longitud = typeof value === 'string' ? value.length : 0
  const cercaDelLimite = longitud >= limite * 0.9

  return (
    <div className="space-y-1">
      <Textarea
        {...props}
        id={id}
        value={value}
        maxLength={limite}
        aria-describedby={cn(props['aria-describedby'], idContador)}
        className={className}
      />
      <p
        id={idContador}
        aria-live="polite"
        className={cn(
          'text-right text-xs tabular-nums',
          cercaDelLimite ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {longitud}/{limite}
      </p>
    </div>
  )
}
