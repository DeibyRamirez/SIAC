import { peticionApiServidor } from '@/lib/servicios/cliente-api-servidor'
import {
  type FiltrosPanelProgramas,
  type RespuestaPanelProgramas,
  rutaPanelProgramas,
} from '@/lib/servicios/panel-programas.servicio'

/** Consulta del panel desde un Server Component con la cookie de sesión (R-010.3a). */
export async function listarPanelProgramasServidor(
  filtros: FiltrosPanelProgramas,
): Promise<RespuestaPanelProgramas> {
  return peticionApiServidor<RespuestaPanelProgramas>(rutaPanelProgramas(filtros))
}
