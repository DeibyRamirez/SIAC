import type { CategoriaIdPowerBi } from '@/lib/informes-powerbi'
import { peticionApi } from './cliente-api'

export interface InformePowerBiMetadatos {
  categoriaId: string
  configurado: boolean
  urlHash: string | null
  activo: boolean
  updatedAt: string | null
}

export interface InformePowerBiUrlRespuesta {
  categoriaId: string
  url: string
  urlHash: string
}

export async function listarInformesPowerBiApi(): Promise<InformePowerBiMetadatos[]> {
  return peticionApi<InformePowerBiMetadatos[]>('/powerbi/informes')
}

export async function obtenerUrlInformePowerBiApi(
  categoriaId: CategoriaIdPowerBi,
): Promise<InformePowerBiUrlRespuesta> {
  return peticionApi<InformePowerBiUrlRespuesta>(`/powerbi/informes/${categoriaId}/url`)
}

export async function actualizarUrlInformePowerBiApi(
  categoriaId: CategoriaIdPowerBi,
  urlPublica: string,
): Promise<InformePowerBiMetadatos> {
  return peticionApi<InformePowerBiMetadatos>(`/powerbi/informes/${categoriaId}`, {
    method: 'PUT',
    body: JSON.stringify({ urlPublica }),
  })
}
