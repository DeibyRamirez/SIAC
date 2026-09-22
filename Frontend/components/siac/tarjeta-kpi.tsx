import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TarjetaKpiProps {
  titulo: string
  valor: string | number
  descripcion?: string
  icono?: LucideIcon
  tendencia?: { valor: string; positiva: boolean }
  className?: string
  acento?: 'esmeralda' | 'cyan' | 'coral' | 'ocre' | 'purpura'
}

const coloresAcento = {
  esmeralda: 'border-esmeralda bg-esmeralda/10 text-esmeralda',
  cyan: 'border-cyan-tecnico bg-cyan-tecnico/10 text-cyan-tecnico',
  coral: 'border-coral bg-coral/10 text-coral',
  ocre: 'border-ocre bg-ocre/10 text-ocre',
  purpura: 'border-purpura bg-purpura/10 text-purpura',
}

export function TarjetaKpi({
  titulo,
  valor,
  descripcion,
  icono: Icono,
  tendencia,
  className,
  acento = 'esmeralda',
}: TarjetaKpiProps) {
  return (
    <Card className={cn('border-l-4', coloresAcento[acento].split(' ')[0], className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="etiqueta-seccion text-[10px]">{titulo}</p>
            <p className="text-3xl font-extrabold text-primary">{valor}</p>
            {descripcion && (
              <p className="text-xs text-muted-foreground">{descripcion}</p>
            )}
            {tendencia && (
              <p
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold',
                  tendencia.positiva ? 'text-esmeralda' : 'text-coral',
                )}
              >
                {tendencia.positiva ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {tendencia.valor}
              </p>
            )}
          </div>
          {Icono && (
            <div
              className={cn(
                'flex size-11 items-center justify-center rounded-xl border',
                coloresAcento[acento],
              )}
            >
              <Icono className="size-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
