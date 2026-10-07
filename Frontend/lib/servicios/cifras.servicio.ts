import { peticionApi } from './cliente-api';
import type { CategoriaCifras, RespuestaCifras } from '@/lib/tipos/cifras';

export async function listarCategoriasCifrasApi() {
  return peticionApi<{ categorias: CategoriaCifras[] }>('/cifras/categorias');
}

export async function obtenerCifrasEstudiantesApi(periodo?: string) {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return peticionApi<RespuestaCifras>(`/cifras/estudiantes${params}`);
}
