import { Skeleton } from '@/components/ui/skeleton'

export type VarianteEsqueleto = 'panel' | 'tabla' | 'detalle' | 'formulario'

/**
 * Esqueleto de carga de página (loading.tsx): reserva el espacio del contenido real para que la
 * navegación no muestre una pantalla vacía. Accesible: role="status" y texto para lectores.
 */
export function EsqueletoPagina({ variante = 'tabla' }: { variante?: VarianteEsqueleto }) {
  return (
    <div className="space-y-6 p-4 md:p-6" role="status" aria-busy="true" data-testid={`esqueleto-${variante}`}>
      <span className="sr-only">Cargando la página…</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {variante === 'panel' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {variante === 'tabla' && (
        <div className="space-y-2 rounded-xl border p-4">
          <Skeleton className="h-9 w-full max-w-sm" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {variante === 'detalle' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[420px] rounded-xl" />
          <div className="space-y-3 rounded-xl border p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}
      {variante === 'formulario' && (
        <div className="max-w-2xl space-y-4 rounded-xl border p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
