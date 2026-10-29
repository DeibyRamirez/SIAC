import {
  EsqueletoDetalle,
  EsqueletoEncabezado,
  EsqueletoFiltros,
  EsqueletoFormulario,
  EsqueletoShell,
  EsqueletoTabla,
  EsqueletoTarjetas,
} from '@/components/siac/esqueletos'

/** Tipo de página: decide qué bloques tiene su esqueleto (mismo orden que la página real). */
export type TipoEsqueletoPagina =
  | 'resumen'
  | 'busqueda'
  | 'tabla'
  | 'detalle'
  | 'proceso'
  | 'formulario'
  | 'tarjetas'
  | 'vigencias'
  | 'usuarios'

/** Ruta → tipo. Los segmentos dinámicos ([id], [categoria]) se resuelven por patrón. */
const REGLAS: Array<[RegExp, TipoEsqueletoPagina]> = [
  [/^\/(administrador|cargador|revisor|superadmin)\/?$/, 'resumen'],
  [/^\/administrador\/dashboard/, 'resumen'],
  [/^\/administrador\/busqueda/, 'busqueda'],
  [/^\/administrador\/vigencias/, 'vigencias'],
  [/^\/(administrador|superadmin)\/usuarios/, 'usuarios'],
  [/^\/administrador\/programas\/.+/, 'proceso'],
  [/^\/(administrador|cargador)\/evidencias\/nueva/, 'formulario'],
  [/^\/(administrador|cargador)\/evidencias\/[^/]+$/, 'detalle'],
  [/^\/revisor\/bandeja\/[^/]+$/, 'detalle'],
  [/^\/(administrador|cargador)\/plantillas/, 'tarjetas'],
  [/^\/administrador\/programas$/, 'tarjetas'],
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
          <EsqueletoTabla filas={4} />
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
          <EsqueletoTabla />
        </>
      )}
      {tipo === 'usuarios' && (
        <>
          <EsqueletoEncabezado conAccion />
          <EsqueletoTabla columnas={5} filas={6} />
        </>
      )}
      {tipo === 'vigencias' && (
        <>
          <EsqueletoEncabezado />
          <EsqueletoTarjetas cantidad={3} columnas="sm:grid-cols-3" />
          <EsqueletoTabla columnas={6} />
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
          <EsqueletoTarjetas cantidad={1} alto="h-24" columnas="grid-cols-1" />
          <EsqueletoTarjetas cantidad={4} />
          <EsqueletoTabla filas={4} />
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
          <EsqueletoTarjetas cantidad={6} alto="h-36" columnas="sm:grid-cols-2 xl:grid-cols-3" />
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
