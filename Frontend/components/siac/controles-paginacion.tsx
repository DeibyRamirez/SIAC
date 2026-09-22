import { Button } from '@/components/ui/button'

interface ControlesPaginacionProps {
  pagina: number
  limite: number
  total: number
  onCambiarPagina: (pagina: number) => void
}

export function ControlesPaginacion({
  pagina,
  limite,
  total,
  onCambiarPagina,
}: ControlesPaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite))

  if (total <= limite) {
    return (
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'registro' : 'registros'}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">
        Página {pagina} de {totalPaginas} · {total} registros
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiarPagina(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
