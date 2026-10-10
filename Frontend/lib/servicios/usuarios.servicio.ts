import { peticionApi } from './cliente-api';
import type { RolUsuario } from '@/lib/tipos';

export interface ProgramaAsignadoApi {
  id: string
  nombre: string
  codigo: string
  slug: string
  facultad: string | null
  nivel: string
  activo: boolean
}

export interface UsuarioApi {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  cargo?: string;
  dependencia?: string;
  activo: boolean;
  createdAt: string;
  programasAsignados?: ProgramaAsignadoApi[];
  responsableProcesoInstitucional?: boolean;
}

export interface CrearUsuarioPayload {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: RolUsuario;
  cargo?: string;
  dependencia?: string;
}

export interface ActualizarUsuarioPayload {
  nombre?: string;
  cargo?: string;
  dependencia?: string;
  activo?: boolean;
  contrasena?: string;
}

export async function listarUsuariosApi(): Promise<UsuarioApi[]> {
  return peticionApi<UsuarioApi[]>('/usuarios');
}

export async function crearUsuarioApi(datos: CrearUsuarioPayload): Promise<UsuarioApi> {
  return peticionApi<UsuarioApi>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function actualizarUsuarioApi(
  id: string,
  datos: ActualizarUsuarioPayload,
): Promise<UsuarioApi> {
  return peticionApi<UsuarioApi>(`/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });
}

export async function desactivarUsuarioApi(id: string): Promise<UsuarioApi> {
  return peticionApi<UsuarioApi>(`/usuarios/${id}`, { method: 'DELETE' });
}

export async function listarProgramasDeUsuarioApi(usuarioId: string) {
  return peticionApi<{ datos: ProgramaAsignadoApi[] }>(`/usuarios/${usuarioId}/programas`)
}

export async function asignarProgramasUsuarioApi(usuarioId: string, programaIds: string[]) {
  return peticionApi<{ datos: ProgramaAsignadoApi[] }>(`/usuarios/${usuarioId}/programas`, {
    method: 'PUT',
    body: JSON.stringify({ programaIds }),
  })
}

export async function asignarAlcanceInstitucionalUsuarioApi(
  usuarioId: string,
  responsable: boolean,
) {
  return peticionApi<{ datos: { id: string; responsableProcesoInstitucional: boolean } }>(
    `/usuarios/${usuarioId}/alcance-institucional`,
    {
      method: 'PUT',
      body: JSON.stringify({ responsable }),
    },
  )
}

export async function actualizarRolUsuarioApi(usuarioId: string, rol: RolUsuario) {
  return peticionApi<UsuarioApi>(`/usuarios/${usuarioId}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ rol }),
  })
}
