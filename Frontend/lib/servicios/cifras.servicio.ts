import { ErrorApi, peticionApi, peticionApiArchivo } from './cliente-api';
import type {
  CategoriaCifras,
  FiltrosCifrasCategoria,
  PlantillaJsonCifras,
  ResultadoImportacionCifras,
  RespuestaCifras,
  RespuestaFiltrosCifras,
  VariableCifra,
} from '@/lib/tipos/cifras';

export async function listarCategoriasCifrasApi() {
  return peticionApi<{ categorias: CategoriaCifras[] }>('/cifras/categorias');
}

function parametrosCifras(filtros: FiltrosCifrasCategoria = {}): string {
  const params = new URLSearchParams();
  if (filtros.periodo) params.set('periodo', filtros.periodo);
  if (filtros.facultad) params.set('facultad', filtros.facultad);
  if (filtros.programaId) params.set('programaId', filtros.programaId);
  if (filtros.programa) params.set('programa', filtros.programa);
  if (filtros.sede) params.set('sede', filtros.sede);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function obtenerCifrasCategoriaApi(
  categoriaId: string,
  filtros: FiltrosCifrasCategoria = {},
) {
  return peticionApi<RespuestaCifras>(
    `/cifras/${encodeURIComponent(categoriaId)}${parametrosCifras(filtros)}`,
  );
}

/** Opciones reales de filtros derivadas de los registros persistidos de la categoría. */
export async function obtenerFiltrosCifrasApi(
  categoriaId: string,
  filtros: { periodo?: string; facultad?: string } = {},
) {
  return peticionApi<RespuestaFiltrosCifras>(
    `/cifras/${encodeURIComponent(categoriaId)}/filtros${parametrosCifras(filtros)}`,
  );
}

/** Compatibilidad con el endpoint heredado; delega en obtenerCifrasCategoriaApi. */
export async function obtenerCifrasEstudiantesApi(periodo?: string) {
  return obtenerCifrasCategoriaApi('estudiantes', periodo ? { periodo } : {});
}

export async function descargarPlantillaCifrasApi(categoriaId: string) {
  return peticionApiArchivo(
    `/cifras/${encodeURIComponent(categoriaId)}/plantilla`,
    `plantilla-cifras-${categoriaId}.xlsx`,
  );
}

/** Ejemplo JSON (2 registros) con las claves del esquema de la categoría. */
export async function descargarPlantillaJsonCifrasApi(categoriaId: string) {
  return peticionApi<PlantillaJsonCifras>(
    `/cifras/${encodeURIComponent(categoriaId)}/plantilla.json`,
  );
}

export async function importarCifrasExcelApi(categoriaId: string, archivo: File) {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  return peticionApi<ResultadoImportacionCifras>(
    `/cifras/${encodeURIComponent(categoriaId)}/importar`,
    { method: 'POST', body: formulario },
  );
}

export async function listarVariablesCifrasApi(categoriaId?: string) {
  const parametros = categoriaId ? `?categoriaId=${encodeURIComponent(categoriaId)}` : '';
  return peticionApi<{ variables: VariableCifra[] }>(`/cifras/variables${parametros}`);
}

export async function actualizarVariableCifraApi(
  id: string,
  datos: { etiquetaCuac?: string; descripcion?: string; activo?: boolean },
) {
  return peticionApi<VariableCifra>(`/cifras/variables/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });
}

export { ErrorApi };
