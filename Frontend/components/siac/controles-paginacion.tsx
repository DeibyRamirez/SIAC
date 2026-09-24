import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ControlesPaginacionProps {
  pagina: number
  limite: number
  total: number
  onCambiarPagina: (pagina: number) => void
  className?: string
}

export function ControlesPaginacion({
  pagina,
  limite,
  total,
  onCambiarPagina,
  className,
}: ControlesPaginacionProps) {
  if (total <= 0) {
    return null
  }

  const totalPaginas = Math.max(1, Math.ceil(total / limite))

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm',
        className,
      )}
    >
      <span className="text-muted-foreground">
        Página {pagina} de {totalPaginas} · {total} {total === 1 ? 'registro' : 'registros'}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pagina <= 1}
          aria-label="Página anterior"
          onClick={() => onCambiarPagina(pagina - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pagina >= totalPaginas}
          aria-label="Página siguiente"
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
