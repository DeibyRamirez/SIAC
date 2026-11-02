import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Esqueletos de carga reutilizables (loading.tsx y estados de carga en el cliente).
 * Reproducen la estructura real de cada bloque para que la página no salte al llegar los datos.
 */

/** Encabezado de página (EncabezadoPagina): etiqueta, título y descripción con borde institucional. */
export function EsqueletoEncabezado({ conAccion = false }: { conAccion?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" data-esqueleto="encabezado">
      <div className="borde-institucional space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      {conAccion ? <Skeleton className="h-9 w-40 rounded-lg" /> : null}
    </div>
  )
}

/** Tarjeta «Filtros de búsqueda»: buscador y rejilla de selectores. */
export function EsqueletoFiltros({ campos = 4 }: { campos?: number }) {
  return (
    <div className="tarjeta-institucional space-y-4 border bg-white p-6" data-esqueleto="filtros">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: campos }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tabla con cabecera y filas; mismo borde y radio que las tablas de la app. */
export function EsqueletoTabla({ filas = 6, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white" data-esqueleto="tabla">
      <div className="grid gap-4 border-b bg-muted/40 px-4 py-3" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {Array.from({ length: columnas }, (_, i) => (
          <Skeleton key={i} className="h-3 w-3/4" />
        ))}
      </div>
      {Array.from({ length: filas }, (_, f) => (
        <div
          key={f}
          className="grid gap-4 border-b px-4 py-3 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columnas }, (_, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-full' : 'w-2/3')} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Rejilla de tarjetas (KPI, plantillas, accesos). */
export function EsqueletoTarjetas({ cantidad = 4, alto = 'h-28', columnas = 'sm:grid-cols-2 xl:grid-cols-4' }: { cantidad?: number; alto?: string; columnas?: string }) {
  return (
    <div className={cn('grid gap-4', columnas)} data-esqueleto="tarjetas">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className={cn('tarjeta-institucional space-y-3 border bg-white p-5', alto)}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

/** Pila de campos (etiqueta + control). `columnas` reproduce la rejilla del formulario real. */
export function EsqueletoCampos({
  campos = 3,
  columnas = 'grid-cols-1',
}: {
  campos?: number
  columnas?: string
}) {
  return (
    <div className={cn('grid gap-4', columnas)} data-esqueleto="campos">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Filas horizontales (versiones, usuarios, etapas del trámite). */
export function EsqueletoFilas({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3" data-esqueleto="filas">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/** Vista previa de un documento: título y líneas de párrafo. */
export function EsqueletoDocumento({ className }: { className?: string }) {
  return (
    <div
      className={cn('space-y-3 rounded-xl border bg-white p-6', className)}
      data-esqueleto="documento"
      aria-hidden="true"
    >
      <Skeleton className="mx-auto h-4 w-2/3" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i % 4 === 3 ? 'w-4/5' : 'w-full')} />
      ))}
    </div>
  )
}

/** Marco del informe, con la misma proporción que el iframe de Power BI. */
export function EsqueletoInforme() {
  return (
    <div className="tarjeta-visual overflow-hidden bg-white" data-esqueleto="informe">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-video" />
    </div>
  )
}

/** Fila de búsqueda y selectores, sin la tarjeta grande de filtros avanzados. */
export function EsqueletoBarraFiltros({
  campos = 2,
  busqueda = true,
}: {
  campos?: number
  busqueda?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-3" data-esqueleto="barra-filtros">
      {busqueda ? <Skeleton className="h-9 w-full max-w-md" /> : null}
      {Array.from({ length: campos }, (_, i) => (
        <Skeleton key={i} className="h-9 w-40" />
      ))}
    </div>
  )
}

/** Formulario en tarjeta con etiquetas y campos. */
export function EsqueletoFormulario({ campos = 5 }: { campos?: number }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" data-esqueleto="formulario">
      <div className="tarjeta-institucional space-y-4 border bg-white p-6">
        {Array.from({ length: campos }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
      <div className="tarjeta-institucional h-72 space-y-3 border bg-white p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

/** Detalle de evidencia o programa: visor a la izquierda y panel de datos a la derecha. */
export function EsqueletoDetalle() {
  return (
    <div className="space-y-6" data-esqueleto="detalle">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-[420px] rounded-xl" />
        <div className="tarjeta-institucional space-y-4 border bg-white p-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Marco de la app (barra lateral, barra superior, contenido y pie) con las mismas clases y
 * medidas que ShellAplicacion. Lo usan loading.tsx y la guardia de sesión, que se renderizan
 * fuera del shell real (el shell vive dentro de cada página), así no hay doble barra ni salto.
 */
export function EsqueletoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fondo-app flex min-h-screen" data-esqueleto="shell">
      <aside className="panel-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-3 border-r border-primary/20 px-3 pt-5 shadow-lg md:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl bg-white/20" />
          <Skeleton className="h-4 w-24 bg-white/20" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl bg-white/80" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-white/15" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="panel-topbar flex h-[4.5rem] items-center gap-4 px-4 md:px-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mx-auto hidden h-9 w-full max-w-md md:block" />
          <Skeleton className="ml-auto size-9 rounded-full md:ml-0" />
        </header>
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        <footer className="footer-institucional h-10 shrink-0" />
      </div>
    </div>
  )
}
