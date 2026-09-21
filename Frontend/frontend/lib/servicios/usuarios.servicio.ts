import { peticionApi } from './cliente-api';
import type { RolUsuario } from '@/lib/tipos';

export interface UsuarioApi {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  cargo?: string;
  dependencia?: string;
  activo: boolean;
  createdAt: string;
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
