import { peticionApi, guardarToken, eliminarToken } from './cliente-api';
import type { RolUsuario } from '@/lib/tipos';

export interface RespuestaLogin {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
  };
}

export async function iniciarSesionApi(
  correo: string,
  contrasena: string,
): Promise<RespuestaLogin> {
  const respuesta = await peticionApi<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  });
  guardarToken(respuesta.token);
  return respuesta;
}

export async function obtenerPerfilApi() {
  return peticionApi<{ id: string; nombre: string; correo: string; rol: RolUsuario }>(
    '/auth/perfil',
  );
}

export function cerrarSesionApi(): void {
  eliminarToken();
}
