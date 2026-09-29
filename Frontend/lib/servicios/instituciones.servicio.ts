import { peticionApi } from './cliente-api'
import type { Institucion } from '@/lib/tipos'
import type { ProgresoProcesoSIAC } from './progreso-programa.servicio'

/** HU-010: registro único de la CUAC (dueña de las guías G3 y G4). */
export async function obtenerInstitucionPrincipalApi(): Promise<Institucion> {
  return peticionApi<Institucion>('/instituciones/principal')
}

/** Avance del trámite institucional (G3/G4), sin atribuirlo a ninguna carrera. */
export async function obtenerProgresoInstitucionApi(
  institucionId: string,
): Promise<ProgresoProcesoSIAC> {
  return peticionApi<ProgresoProcesoSIAC>(`/instituciones/${institucionId}/progreso`)
}
