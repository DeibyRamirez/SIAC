import { peticionApi } from './cliente-api';
import type { CodigoCondicionDocumentoMaestro } from '@/lib/condiciones-documento-maestro';
import type { CodigoCondicionInstitucional } from '@/lib/condiciones-institucionales';
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
  firmaDescarga?: string | null;
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

/** Puntaje entero de la verificación por checklist (G1 n/9, G3 n/6). */

export interface ComentarioInlinePayload {
  hunkId?: string
  anchor?: string
  quote?: string
  texto: string
  createdAt?: string
}

export interface CondicionInstitucionalDictamenPayload {
  codigo: CodigoCondicionInstitucional
  cumple: boolean
  observacion?: string
}

/** Puntaje entero de la verificación por checklist (G1 n/9, G3 n/6). */
export interface PuntajeVerificacion {
  puntajeActual: number
  totalCondicionesActual: number
}

export async function dictaminarEvidenciaApi(
  id: string,
  payload: {
    estado?: Extract<EstadoEvidencia, 'Validado' | 'Rechazado'>
    observaciones?: string
    condiciones?: CondicionDictamenPayload[]
    comentariosInline?: ComentarioInlinePayload[]
    condicionesInstitucionales?: CondicionInstitucionalDictamenPayload[]
  },
): Promise<Evidencia> {
  return peticionApi<Evidencia>(`/evidencias/${id}/dictamen`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface LineaDiffApi {
  tipo: 'contexto' | 'agregado' | 'eliminado'
  texto: string
  numeroAntes: number | null
  numeroDespues: number | null
}

export interface HunkDiffApi {
  id: string
  encabezado: string
  indiceInicio: number
  lineas: LineaDiffApi[]
  agregadas: number
  eliminadas: number
}

export interface MediaDiffApi {
  part: string
  estado: 'agregado' | 'eliminado' | 'modificado' | 'sinCambios'
  hashAntes?: string
  hashDespues?: string
  tamanoAntes?: number
  tamanoDespues?: number
}

export interface DiffVersionesApi {
  versionA: number
  versionB: number
  nombreArchivoA: string
  nombreArchivoB: string
  agregadas: number
  eliminadas: number
  sinCambios: boolean
  /** Documento completo con marcas: contexto + eliminado + agregado. */
  lineas: LineaDiffApi[]
  hunks: HunkDiffApi[]
  media: MediaDiffApi[]
}

export async function obtenerDiffVersionesApi(
  id: string,
  versionA: number,
  versionB: number,
): Promise<DiffVersionesApi> {
  return peticionApi<DiffVersionesApi>(
    `/evidencias/${id}/versiones/${versionA}/diff/${versionB}`,
  )
}

export interface ComentarioEvidenciaApi {
  hunkId?: string
  anchor?: string
  quote?: string
  texto: string
}

export async function obtenerComentariosEvidenciaApi(
  id: string,
  version?: number,
): Promise<ComentarioEvidenciaApi[]> {
  const query = version !== undefined ? `?version=${version}` : ''
  return peticionApi<ComentarioEvidenciaApi[]>(
    `/evidencias/${id}/comentarios${query}`,
  )
}

export async function obtenerEvaluacionesCondicionApi(id: string, numeroRevision?: number) {
  const query =
    numeroRevision !== undefined ? `?numeroRevision=${numeroRevision}` : '';
  return peticionApi<
    {
      codigoCondicion: CodigoCondicionDocumentoMaestro
      cumple: boolean
      observacion?: string | null
      numeroRevision: number
    }[]
  >(`/evidencias/${id}/evaluaciones-condicion${query}`);
}

export async function obtenerEvaluacionesCondicionInstitucionalApi(
  id: string,
  numeroRevision?: number,
) {
  const query =
    numeroRevision !== undefined ? `?numeroRevision=${numeroRevision}` : '';
  return peticionApi<
    {
      codigoCondicion: CodigoCondicionInstitucional
      cumple: boolean
      observacion?: string | null
      numeroRevision: number
    }[]
  >(`/evidencias/${id}/evaluaciones-condicion-institucional${query}`);
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

export interface FilaRevisionRevisorApi {
  evidenciaId: string
  nombre: string
  estado: EstadoEvidencia
  version: number | null
  numeroRevision: number
  fechaEnvioRevision: string
  tipoEnvio: 'inicial' | 'correccion'
  observacionEnvio?: string | null
  observacionesDictamen?: string | null
  /** Puntaje n del ciclo (null si aún no se verifica). */
  puntaje?: number | null
  totalCondiciones?: number | null
  ultimoDictamenEstado?: EstadoEvidencia | null
  ultimoDictamenFecha?: string | null
  programa?: { id: string; nombre: string }
  autor?: { id: string; nombre: string }
}

export interface ConteosEvidenciaApi {
  borrador: number
  enRevision: number
  conObservaciones: number
  cumple: number
  validado: number
  rechazado: number
}

export async function obtenerConteosEvidenciasApi() {
  return peticionApi<ConteosEvidenciaApi>('/evidencias/conteos')
}

export async function listarMisRevisionesRevisorApi(pagina = 1, limite = 20) {
  const params = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
  })
  return peticionApi<RespuestaPaginada<FilaRevisionRevisorApi>>(
    `/evidencias/mis-revisiones-revisor?${params}`,
  )
}

