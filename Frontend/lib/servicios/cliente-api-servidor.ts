import { cookies } from 'next/headers';
import {
  NOMBRE_COOKIE_SESION,
  urlBackendInterna,
} from '@/lib/servicios/config-api';
import { ErrorApi } from '@/lib/servicios/cliente-api';

export async function peticionApiServidor<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const almacen = await cookies();
  const token = almacen.get(NOMBRE_COOKIE_SESION)?.value;

  const cabeceras: Record<string, string> = {
    ...(opciones.headers as Record<string, string>),
  };

  if (token) {
    cabeceras.Authorization = `Bearer ${token}`;
  }

  if (!(opciones.body instanceof FormData)) {
    cabeceras['Content-Type'] = cabeceras['Content-Type'] ?? 'application/json';
  }

  const respuesta = await fetch(`${urlBackendInterna()}${ruta}`, {
    ...opciones,
    headers: cabeceras,
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({ message: 'Error desconocido' }));
    throw new ErrorApi(
      Array.isArray(error.message)
        ? error.message.join(', ')
        : (error.message ?? `HTTP ${respuesta.status}`),
      respuesta.status,
    );
  }

  if (respuesta.status === 204) return undefined as T;
  return respuesta.json();
}
