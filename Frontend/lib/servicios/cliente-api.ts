import {
  debeMostrarCargaGlobal,
  notificarFinCarga,
  notificarInicioCarga,
  obtenerMensajeCarga,
} from '@/lib/servicios/control-carga-global';
import { URL_BASE_CLIENTE, apiDisponible } from '@/lib/servicios/config-api';

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public codigoEstado: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export async function peticionApi<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(opciones.headers as Record<string, string>),
  };

  if (!(opciones.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const metodo = (opciones.method ?? 'GET').toUpperCase();
  const mostrarCarga = debeMostrarCargaGlobal(metodo, ruta);
  if (mostrarCarga) {
    notificarInicioCarga(obtenerMensajeCarga(metodo, ruta));
  }

  try {
    const respuesta = await fetch(`${URL_BASE_CLIENTE}${ruta}`, {
      ...opciones,
      headers,
      credentials: 'include',
    });

    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({ message: 'Error desconocido' }));
      throw new ErrorApi(
        Array.isArray(error.message) ? error.message.join(', ') : (error.message ?? `HTTP ${respuesta.status}`),
        respuesta.status,
      );
    }

    if (respuesta.status === 204) return undefined as T;
    return respuesta.json();
  } finally {
    if (mostrarCarga) {
      notificarFinCarga();
    }
  }
}

export { apiDisponible };
