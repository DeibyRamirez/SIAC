import { peticionApi } from './cliente-api';
import type { CodigoCondicionDocumentoMaestro } from '@/lib/condiciones-documento-maestro';
import type { Evidencia, EstadoEvidencia } from '@/lib/tipos';

export interface RespuestaPaginada<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltrosEvidenciaApi {
  programaId?: string;
  periodo?: string;
  factor?: string;
  indicador?: string;
  estado?: string;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface EvidenciaVersionApi {
  id: string;
  evidenciaId: string;
  numero: number;
  nombreArchivo: string;
  rutaArchivo: string;
  mimeType?: string;
  tamanoBytes?: number;
  subidoPorId: string;
  createdAt: string;
  subidoPor?: { id: string; nombre: string };
}

export async function obtenerEvidenciaApi(id: string): Promise<Evidencia> {
  return peticionApi<Evidencia>(`/evidencias/${id}`);
}

export async function listarEvidenciasApi(filtros: FiltrosEvidenciaApi = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return peticionApi<RespuestaPaginada<Evidencia>>(`/evidencias?${params}`);
}

export async function crearEvidenciaApi(
  datos: FormData,
): Promise<Evidencia> {
  return peticionApi<Evidencia>('/evidencias', {
    method: 'POST',
    body: datos,
  });
}

export async function actualizarEvidenciaApi(
  id: string,
  cambios: Partial<Evidencia>,
): Promise<Evidencia> {
  return peticionApi<Evidencia>(`/evidencias/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export async function subirVersionArchivoApi(
  id: string,
  archivo: File,
): Promise<Evidencia> {
  const formData = new FormData();
  formData.append('archivo', archivo);
  return peticionApi<Evidencia>(`/evidencias/${id}/archivo`, {
    method: 'PATCH',
    body: formData,
  });
}

export async function eliminarEvidenciaApi(id: string): Promise<void> {
  return peticionApi<void>(`/evidencias/${id}`, { method: 'DELETE' });
}

export interface CondicionDictamenPayload {
  codigo: CodigoCondicionDocumentoMaestro
  cumple: boolean
  observacion?: string
}

export async function dictaminarEvidenciaApi(
  id: string,
  payload: {
    estado?: Extract<EstadoEvidencia, 'Validado' | 'Rechazado'>
    observaciones?: string
    condiciones?: CondicionDictamenPayload[]
  },
): Promise<Evidencia> {
  return peticionApi<Evidencia>(`/evidencias/${id}/dictamen`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function obtenerEvaluacionesCondicionApi(id: string) {
  return peticionApi<
    {
      codigoCondicion: CodigoCondicionDocumentoMaestro
      cumple: boolean
      observacion?: string | null
      numeroRevision: number
    }[]
  >(`/evidencias/${id}/evaluaciones-condicion`);
}

export async function enviarRevisionApi(id: string): Promise<Evidencia> {
  return peticionApi<Evidencia>(`/evidencias/${id}/enviar-revision`, {
    method: 'POST',
  });
}

export async function obtenerHistorialApi(id: string) {
  return peticionApi<Array<{
    id: string;
    estado: EstadoEvidencia;
    observacion?: string;
    actorId?: string;
    createdAt: string;
  }>>(`/evidencias/${id}/historial`);
}

export async function listarVersionesApi(id: string) {
  return peticionApi<EvidenciaVersionApi[]>(`/evidencias/${id}/versiones`);
}

export async function obtenerUrlDescargaApi(id: string, version?: number) {
  const query = version !== undefined ? `?version=${version}` : '';
  return peticionApi<{ url: string; expiraEn: number }>(`/evidencias/${id}/descargar${query}`);
}

export async function listarPendientesApi() {
  return peticionApi<RespuestaPaginada<Evidencia>>('/aprobacion/pendientes');
}

