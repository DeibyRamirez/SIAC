import { peticionApi } from '@/lib/servicios/cliente-api';
import type { Evidencia } from '@/lib/tipos';
import {
  type FiltrosBusquedaUrl,
  filtrosBusquedaAQuery,
} from '@/lib/utilidades/parametros-busqueda-url';

export interface RespuestaBusquedaEvidencias {
  resultados: Evidencia[];
  total: number;
  pagina: number;
  limite: number;
}

export function rutaBusquedaEvidencias(filtros: FiltrosBusquedaUrl, limite = 20): string {
  const params = new URLSearchParams(filtrosBusquedaAQuery(filtros));
  params.set('limite', String(limite));
  return `/busqueda?${params}`;
}

export async function buscarEvidenciasApi(
  filtros: FiltrosBusquedaUrl,
  limite = 20,
): Promise<RespuestaBusquedaEvidencias> {
  return peticionApi<RespuestaBusquedaEvidencias>(rutaBusquedaEvidencias(filtros, limite));
}
