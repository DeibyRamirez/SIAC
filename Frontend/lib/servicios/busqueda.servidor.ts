import { peticionApiServidor } from '@/lib/servicios/cliente-api-servidor';
import type { FiltrosBusquedaUrl } from '@/lib/utilidades/parametros-busqueda-url';
import {
  type RespuestaBusquedaEvidencias,
  rutaBusquedaEvidencias,
} from '@/lib/servicios/busqueda.servicio';

export async function buscarEvidenciasServidor(
  filtros: FiltrosBusquedaUrl,
  limite = 20,
): Promise<RespuestaBusquedaEvidencias> {
  return peticionApiServidor<RespuestaBusquedaEvidencias>(
    rutaBusquedaEvidencias(filtros, limite),
  );
}
