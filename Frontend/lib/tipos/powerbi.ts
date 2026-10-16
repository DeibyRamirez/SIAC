export interface RespuestaEmbedPowerBi {
  embedUrl: string
  embedToken: string | null
  reportId: string
  categoriaId: string | null
  fallback: boolean
  mensaje?: string
}
