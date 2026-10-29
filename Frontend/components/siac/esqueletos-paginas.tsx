import { Skeleton } from '@/components/ui/skeleton'
import {
  EsqueletoBarraFiltros,
  EsqueletoCampos,
  EsqueletoDetalle,
  EsqueletoEncabezado,
  EsqueletoFilas,
  EsqueletoFiltros,
  EsqueletoFormulario,
  EsqueletoShell,
  EsqueletoTabla,
  EsqueletoTarjetas,
} from '@/components/siac/esqueletos'

/** Tipo de página: decide qué bloques tiene su esqueleto (mismo orden que la página real). */
export type TipoEsqueletoPagina =
  | 'resumen'
  | 'inicio-cargador'
  | 'inicio-revisor'
  | 'accesos'
  | 'metricas'
  | 'busqueda'
  | 'tabla'
  | 'listado'
  | 'historial'
  | 'detalle'
  | 'proceso'
  | 'formulario'
  | 'tarjetas'
  | 'catalogo'
  | 'vigencias'
  | 'usuarios'
  | 'asignacion'

/** Ruta → tipo. Los segmentos dinámicos ([id], [categoria]) se resuelven por patrón. */
const REGLAS: Array<[RegExp, TipoEsqueletoPagina]> = [
  [/^\/administrador\/dashboard/, 'metricas'],
  [/^\/administrador\/estructura/, 'resumen'],
  [/^\/administrador\/busqueda/, 'busqueda'],
  [/^\/administrador\/evidencias$/, 'busqueda'],
  [/^\/administrador\/vigencias/, 'vigencias'],
  [/^\/superadmin\/usuarios/, 'usuarios'],
  [/^\/administrador\/usuarios/, 'asignacion'],
  [/^\/administrador\/programas\/.+/, 'proceso'],
  [/^\/administrador\/programas$/, 'catalogo'],
  [/^\/(administrador|cargador)\/evidencias\/nueva/, 'formulario'],
  [/^\/(administrador|cargador)\/evidencias\/[^/]+$/, 'detalle'],
  [/^\/revisor\/bandeja\/[^/]+$/, 'detalle'],
  [/^\/(administrador|cargador)\/plantillas/, 'tarjetas'],
  [/^\/cargador\/evidencias$/, 'listado'],
  [/^\/revisor\/revisiones/, 'historial'],
  [/^\/administrador\/?$/, 'resumen'],
  [/^\/cargador\/?$/, 'inicio-cargador'],
  [/^\/revisor\/?$/, 'inicio-revisor'],
  [/^\/superadmin\/?$/, 'accesos'],
]

export function tipoEsqueletoParaRuta(ruta: string): TipoEsqueletoPagina {
  const limpia = ruta.split('?')[0].replace(/\/+$/, '') || '/'
  return REGLAS.find(([patron]) => patron.test(limpia))?.[1] ?? 'tabla'
}

/** Contenido del esqueleto (sin marco): lo usan loading.tsx y los estados de carga del cliente. */
export function EsqueletoContenidoPagina({ tipo }: { tipo: TipoEsqueletoPagina }) {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-live="polite" data-testid={`esqueleto-${tipo}`}>
      <span className="sr-only">Cargando la página…</span>
      {tipo === 'resumen' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoTarjetas cantidad={1} alto="h-40" columnas="grid-cols-1" />
          <EsqueletoTarjetas />
          <EsqueletoTarjetas cantidad={2} alto="h-64" columnas="xl:grid-cols-2" />
          <EsqueletoFilas filas={3} />
        </>
      )}
      {tipo === 'inicio-cargador' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoTarjetas cantidad={3} columnas="md:grid-cols-3" />
          <EsqueletoTarjetas cantidad={3} alto="h-36" columnas="md:grid-cols-3" />
        </>
      )}
      {tipo === 'inicio-revisor' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoTarjetas cantidad={3} columnas="sm:grid-cols-2 lg:grid-cols-3" />
          <EsqueletoTarjetas cantidad={1} alto="h-24" columnas="grid-cols-1" />
          <EsqueletoFilas filas={4} />
        </>
      )}
      {tipo === 'accesos' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoTarjetas cantidad={4} alto="h-36" columnas="sm:grid-cols-2 lg:grid-cols-3" />
          <EsqueletoTarjetas cantidad={1} alto="h-28" columnas="grid-cols-1" />
        </>
      )}
      {tipo === 'metricas' && (
        <>
          <EsqueletoEncabezado />
          <div data-esqueleto="barra-filtros">
            <Skeleton className="h-9 w-72" />
          </div>
          <EsqueletoTarjetas />
          <EsqueletoTarjetas cantidad={2} alto="h-64" columnas="xl:grid-cols-2" />
        </>
      )}
      {tipo === 'busqueda' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoFiltros campos={8} />
          <EsqueletoTabla columnas={7} />
        </>
      )}
      {tipo === 'tabla' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoBarraFiltros busqueda campos={0} />
          <EsqueletoTabla columnas={6} />
        </>
      )}
      {tipo === 'listado' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoBarraFiltros busqueda={false} campos={1} />
          <EsqueletoTabla columnas={7} />
        </>
      )}
      {tipo === 'historial' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoTabla columnas={7} />
        </>
      )}
      {tipo === 'usuarios' && (
        <>
          <EsqueletoEncabezado />
          <div className="tarjeta-institucional space-y-4 border bg-white p-6">
            <EsqueletoCampos campos={6} columnas="md:grid-cols-2" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
          <EsqueletoTabla columnas={5} filas={6} />
        </>
      )}
      {tipo === 'asignacion' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoFilas filas={6} />
        </>
      )}
      {tipo === 'vigencias' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoTarjetas cantidad={3} alto="h-24" columnas="sm:grid-cols-3" />
          <EsqueletoTabla columnas={5} filas={4} />
          <EsqueletoCampos campos={2} columnas="sm:grid-cols-2" />
          <EsqueletoTarjetas cantidad={3} alto="h-24" columnas="sm:grid-cols-3" />
          <EsqueletoTabla columnas={5} />
        </>
      )}
      {tipo === 'detalle' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoDetalle />
        </>
      )}
      {tipo === 'proceso' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoTarjetas cantidad={1} alto="h-40" columnas="grid-cols-1" />
          <EsqueletoTarjetas cantidad={1} alto="h-24" columnas="grid-cols-1" />
          <EsqueletoTarjetas cantidad={4} />
          <div className="tarjeta-institucional border bg-white p-6">
            <EsqueletoCampos campos={4} columnas="sm:grid-cols-2" />
          </div>
        </>
      )}
      {tipo === 'formulario' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoFormulario />
        </>
      )}
      {tipo === 'tarjetas' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoBarraFiltros campos={2} />
          <EsqueletoTarjetas cantidad={6} alto="h-48" columnas="sm:grid-cols-2 xl:grid-cols-3" />
        </>
      )}
      {tipo === 'catalogo' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoTarjetas cantidad={1} alto="h-28" columnas="grid-cols-1" />
          <EsqueletoBarraFiltros campos={4} />
          <EsqueletoTarjetas cantidad={6} alto="h-96" columnas="sm:grid-cols-2 xl:grid-cols-3" />
        </>
      )}
    </div>
  )
}

/** Página completa en carga: marco de la app + contenido del tipo de la ruta. */
export function EsqueletoPaginaApp({ ruta }: { ruta: string }) {
  return (
    <EsqueletoShell>
      <EsqueletoContenidoPagina tipo={tipoEsqueletoParaRuta(ruta)} />
    </EsqueletoShell>
  )
}
