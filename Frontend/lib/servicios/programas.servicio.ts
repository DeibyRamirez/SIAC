import { peticionApi } from './cliente-api';
import type { NivelPrograma, Programa } from '@/lib/tipos';

export async function listarProgramasApi(): Promise<Programa[]> {
  return peticionApi<Programa[]>('/programas');
}

export async function crearProgramaApi(datos: {
  nombre: string
  nivel: NivelPrograma
}): Promise<Programa> {
  return peticionApi<Programa>('/programas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerProgramaApi(id: string) {
  return peticionApi<Programa & {
    evidenciasValidadas?: number;
    totalEvidencias?: number;
    evidencias?: unknown[];
    anexos?: unknown[];
  }>(`/programas/${id}`);
}

export async function buscarEvidenciasApi(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return peticionApi<{ resultados: unknown[]; total: number; pagina: number; limite: number }>(
    `/busqueda?${query}`,
  );
}

export async function buscarUnificadaApi(consulta: string, limite = 8) {
  const params = new URLSearchParams({ q: consulta, limite: String(limite) });
  return peticionApi<{
    evidencias: { id: string; nombre: string; nombreArchivo: string; estado: string; programaId: string }[];
    plantillas: { id: string; nombre: string; nombreArchivo?: string | null; categoria: string }[];
    documentos: { id: string; titulo: string; nombreArchivo?: string | null; carpeta: string; estado: string }[];
  }>(`/busqueda/unificada?${params}`);
}

export async function listarVigenciasApi(programaId?: string) {
  const query = programaId ? `?programaId=${programaId}` : '';
  return peticionApi<unknown[]>(`/vigencias${query}`);
}

export async function crearVigenciaConArchivoApi(formData: FormData) {
  return peticionApi<unknown>('/vigencias/con-archivo', {
    method: 'POST',
    body: formData,
  });
}

export async function obtenerUrlDescargaVigenciaApi(id: string) {
  return peticionApi<{ url: string; expiraEn: number }>(`/vigencias/${id}/descargar`);
}

export async function listarNotificacionesApi() {
  return peticionApi<{ id: string; mensaje: string; leida: boolean; createdAt: string }[]>(
    '/notificaciones',
  );
}

export async function marcarNotificacionLeidaApi(id: string) {
  return peticionApi(`/notificaciones/${id}/leida`, { method: 'PATCH' });
}

export async function obtenerEmbedPowerBiApi() {
  return peticionApi<{
    embedUrl: string;
    embedToken: string | null;
    fallback: boolean;
    mensaje?: string;
  }>('/powerbi/embed-token');
}

export async function listarEstructuraApi() {
  return peticionApi<unknown[]>('/estructura/etapas');
}
