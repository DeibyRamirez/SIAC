'use client'

import type { EstadoVigencia } from '@/lib/tipos'
import { cn } from '@/lib/utils'

interface BarraProgresoVigenciaProps {
  porcentaje: number
  estado: EstadoVigencia
  className?: string
  compacto?: boolean
}

const coloresEstado: Record<EstadoVigencia, string> = {
  Vigente: 'bg-esmeralda',
  Proximo: 'bg-ocre',
  Vencido: 'bg-fucsia',
}

export function BarraProgresoVigencia({
  porcentaje,
  estado,
  className,
  compacto = false,
}: BarraProgresoVigenciaProps) {
  const valor = Math.min(100, Math.max(0, porcentaje))

  return (
    <div className={cn(compacto ? 'space-y-0' : 'space-y-1', className)}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted',
          compacto ? 'h-2.5' : 'h-2',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', coloresEstado[estado])}
          style={{ width: `${valor}%` }}
        />
      </div>
      {!compacto && (
        <p className="text-xs text-muted-foreground">
          {valor}% del periodo de vigencia transcurrido
        </p>
      )}
    </div>
  )
}
