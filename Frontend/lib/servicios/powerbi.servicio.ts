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

export interface ConfiguracionInsercionPowerBi {
  habilitado: boolean
  workspaceId: string | null
  reportId: string | null
  secretoConfigurado: boolean
  configuracionCompleta: boolean
  activo: boolean
  faltantes: string[]
}

export interface TokenInsercionPowerBi {
  token: string
  embedUrl: string
  reportId: string
  expiraEn: string
}

export interface ResultadoPruebaConexionPowerBi {
  correcto: true
  expiraEn: string
}

export async function obtenerConfiguracionInsercionPowerBiApi(): Promise<ConfiguracionInsercionPowerBi> {
  return peticionApi<ConfiguracionInsercionPowerBi>('/powerbi/insercion')
}

export async function actualizarInsercionPowerBiApi(cuerpo: {
  habilitado?: boolean
  workspaceId?: string
  reportId?: string
}): Promise<ConfiguracionInsercionPowerBi> {
  return peticionApi<ConfiguracionInsercionPowerBi>('/powerbi/insercion', {
    method: 'PATCH',
    body: JSON.stringify(cuerpo),
  })
}

export async function probarConexionPowerBiApi(): Promise<ResultadoPruebaConexionPowerBi> {
  return peticionApi<ResultadoPruebaConexionPowerBi>('/powerbi/probar-conexion', {
    method: 'POST',
  })
}

export async function obtenerTokenInsercionPowerBiApi(): Promise<TokenInsercionPowerBi> {
  return peticionApi<TokenInsercionPowerBi>('/powerbi/token-insercion')
}
