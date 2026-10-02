import type { RolUsuario } from '@/lib/tipos';

export interface RespuestaLogin {
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
  const respuesta = await fetch('/api/sesion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ correo, contrasena }),
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos.message)
      ? datos.message.join(', ')
      : (datos.message ?? 'Error de autenticación');
    throw new Error(mensaje);
  }

  return datos as RespuestaLogin;
}

export async function obtenerPerfilApi() {
  const respuesta = await fetch('/api/sesion', {
    credentials: 'include',
    cache: 'no-store',
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos.message)
      ? datos.message.join(', ')
      : (datos.message ?? 'No autenticado');
    throw new Error(mensaje);
  }

  return datos as { id: string; nombre: string; correo: string; rol: RolUsuario };
}

export async function cerrarSesionApi(): Promise<void> {
  await fetch('/api/sesion', {
    method: 'DELETE',
    credentials: 'include',
  });
}
