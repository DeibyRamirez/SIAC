import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { PanelProgramasCliente } from '@/components/siac/panel-programas-cliente'
import { ROLES_PANEL_PROGRAMAS } from '@/lib/constantes/roles'
import { LIMITE_FILAS_TABLA } from '@/lib/constantes/paginacion'
import { apiDisponible } from '@/lib/servicios/config-api'
import type { FilaPanelPrograma, RespuestaPanelProgramas } from '@/lib/servicios/panel-programas.servicio'
import { listarPanelProgramasServidor } from '@/lib/servicios/panel-programas.servidor'
import { filtrosPanelParaApi, leerFiltrosPanelUrl } from '@/lib/utilidades/parametros-panel-url'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Panel de programas renderizado en el servidor (R-010.3a): con la cookie de sesión se consulta
 * la API y el HTML ya trae la primera página filtrada. Sin datos de prueba ni modo simulado.
 */
export default async function ProgramasAdministradorPage({ searchParams }: PageProps) {
  const filtros = leerFiltrosPanelUrl(await searchParams)
  let datos: RespuestaPanelProgramas = {
    datos: [],
    total: 0,
    page: filtros.pagina,
    limit: LIMITE_FILAS_TABLA,
    totalPaginas: 0,
  }
  let institucion: FilaPanelPrograma | null = null
  let errorCarga: string | null = null

  if (!apiDisponible()) {
    errorCarga = 'No hay conexión con la API.'
  } else {
    const [panel, panelInstitucion] = await Promise.allSettled([
      listarPanelProgramasServidor(filtrosPanelParaApi(filtros, LIMITE_FILAS_TABLA)),
      listarPanelProgramasServidor({ alcance: 'Institucion', limit: 1 }),
    ])
    if (panel.status === 'fulfilled') {
      datos = panel.value
    } else {
      console.error('[programas] Falló la consulta SSR del panel:', panel.reason)
      errorCarga = panel.reason instanceof Error ? panel.reason.message : 'No se pudo cargar el panel.'
    }
    if (panelInstitucion.status === 'fulfilled') {
      institucion = panelInstitucion.value.datos[0] ?? null
    } else {
      console.error('[programas] Falló la consulta SSR de la institución:', panelInstitucion.reason)
    }
  }

  return (
    <PlantillaPaginaApp titulo="Programas académicos" roles={ROLES_PANEL_PROGRAMAS}>
      <PanelProgramasCliente filtros={filtros} datos={datos} institucion={institucion} errorCarga={errorCarga} />
    </PlantillaPaginaApp>
  )
}
