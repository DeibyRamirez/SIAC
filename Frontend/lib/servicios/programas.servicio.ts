import { peticionApi } from './cliente-api';
import type { NivelPrograma, Programa } from '@/lib/tipos';
import type { TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac';

export interface ResumenAvanceInstitucional {
  avanceInstitucional: number
  programasActivos: number
  programasCompletos: number
}

export async function listarProgramasApi(): Promise<Programa[]> {
  return peticionApi<Programa[]>('/programas');
}

export async function obtenerAvanceInstitucionalApi(): Promise<ResumenAvanceInstitucional> {
  return peticionApi<ResumenAvanceInstitucional>('/programas/avance-institucional');
}

export async function iniciarCicloRenovacionProgramaApi(programaId: string) {
  return peticionApi<{ mensaje: string; progreso: unknown }>(
    `/programas/${programaId}/iniciar-ciclo-renovacion`,
    { method: 'POST' },
  );
}

export async function crearProgramaApi(datos: {
  nombre: string
  nivel: NivelPrograma
  facultad?: string
}): Promise<Programa> {
  return peticionApi<Programa>('/programas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function actualizarProgramaApi(
  id: string,
  datos: {
    nombre?: string
    nivel?: NivelPrograma
    facultad?: string
    modalidad?: string
    tipoTramiteActivo?: TipoTramiteSIAC
  },
): Promise<Programa> {
  return peticionApi<Programa>(`/programas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })
}

export async function actualizarEstadoProgramaApi(id: string, activo: boolean): Promise<Programa> {
  return peticionApi<Programa>(`/programas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  })
}

export async function obtenerProgramaApi(id: string) {
  return peticionApi<Programa & {
    evidenciasValidadas?: number;
    totalEvidencias?: number;
    evidencias?: unknown[];
    anexos?: unknown[];
  }>(`/programas/${id}`);
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

export async function obtenerEmbedPowerBiApi(categoriaId?: string) {
  const params = categoriaId ? `?categoriaId=${encodeURIComponent(categoriaId)}` : '';
  return peticionApi<{
    embedUrl: string;
    embedToken: string | null;
    reportId: string;
    categoriaId: string | null;
    fallback: boolean;
    mensaje?: string;
  }>(`/powerbi/embed-token${params}`);
}

export async function listarEstructuraApi() {
  return peticionApi<unknown[]>('/estructura/etapas');
}
