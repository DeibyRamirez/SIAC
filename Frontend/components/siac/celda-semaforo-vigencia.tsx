import { BarraProgresoVigencia } from '@/components/siac/barra-progreso-vigencia'
import type { EstadoVigencia, SemaforoPrograma } from '@/lib/tipos'
import { cn } from '@/lib/utils'

const estadoASemaforo: Record<EstadoVigencia, SemaforoPrograma> = {
  Vigente: 'Verde',
  Proximo: 'Amarillo',
  Vencido: 'Rojo',
}

const estilosPunto: Record<SemaforoPrograma, string> = {
  Verde: 'bg-esmeralda shadow-[0_0_0_4px_rgba(28,188,166,0.25)]',
  Amarillo: 'bg-ocre shadow-[0_0_0_4px_rgba(194,139,16,0.25)]',
  Rojo: 'bg-fucsia shadow-[0_0_0_4px_rgba(216,43,90,0.25)]',
}

const etiquetasEstado: Record<EstadoVigencia, string> = {
  Vigente: 'Vigente',
  Proximo: 'Próximo a vencer',
  Vencido: 'Vencido',
}

interface CeldaSemaforoVigenciaProps {
  estado: EstadoVigencia
  porcentaje: number
  className?: string
}

export function CeldaSemaforoVigencia({ estado, porcentaje, className }: CeldaSemaforoVigenciaProps) {
  const semaforo = estadoASemaforo[estado]
  const valor = Math.min(100, Math.max(0, porcentaje))

  return (
    <div className={cn('min-w-[200px] space-y-2.5', className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn('size-5 shrink-0 rounded-full', estilosPunto[semaforo])}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-primary">{etiquetasEstado[estado]}</p>
          <p className="text-[11px] text-muted-foreground">{valor}% del periodo</p>
        </div>
      </div>
      <BarraProgresoVigencia porcentaje={valor} estado={estado} compacto />
    </div>
  )
}
