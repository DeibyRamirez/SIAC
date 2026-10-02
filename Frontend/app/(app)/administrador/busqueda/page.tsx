import { Suspense } from 'react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { ContenidoBusquedaEvidencias } from '@/components/siac/contenido-busqueda-evidencias'
import { ROLES_CONSULTA_INSTITUCIONAL } from '@/lib/auth-mock'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { apiDisponible } from '@/lib/servicios/config-api'
import type { RespuestaBusquedaEvidencias } from '@/lib/servicios/busqueda.servicio'
import { buscarEvidenciasServidor } from '@/lib/servicios/busqueda.servidor'
import { periodoAcademicoActual } from '@/lib/utilidades/periodo-academico'
import { leerFiltrosBusquedaUrl } from '@/lib/utilidades/parametros-busqueda-url'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BusquedaAdministradorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const leidos = leerFiltrosBusquedaUrl(params)
  const filtrosIniciales = {
    ...leidos,
    periodo: leidos.periodo ?? periodoAcademicoActual(),
  }

  let datosIniciales: RespuestaBusquedaEvidencias = {
    resultados: [],
    total: 0,
    pagina: Number(filtrosIniciales.pagina ?? '1') || 1,
    limite: LIMITE_FILAS_TABLA,
  }

  if (apiDisponible()) {
    try {
      datosIniciales = await buscarEvidenciasServidor(filtrosIniciales, LIMITE_FILAS_TABLA)
    } catch {
      // El cliente reintentará con la cookie o mostrará estado vacío.
    }
  }

  return (
    <PlantillaPaginaApp titulo="Búsqueda de evidencias" roles={ROLES_CONSULTA_INSTITUCIONAL}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <ContenidoBusquedaEvidencias
          filtrosIniciales={filtrosIniciales}
          datosIniciales={datosIniciales}
        />
      </Suspense>
    </PlantillaPaginaApp>
  )
}
