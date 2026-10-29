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
    public codigo?: string,
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
    notificarInicioCarga(obtenerMensajeCarga(metodo, ruta, opciones.body));
  }

  try {
    const respuesta = await fetch(`${URL_BASE_CLIENTE}${ruta}`, {
      ...opciones,
      headers,
      credentials: 'include',
    });

    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({ message: 'Error desconocido' }));
      const codigo =
        typeof error.codigo === 'string'
          ? error.codigo
          : typeof error.error === 'string' && error.error.startsWith('POWERBI_')
            ? error.error
            : undefined;
      throw new ErrorApi(
        Array.isArray(error.message) ? error.message.join(', ') : (error.message ?? `HTTP ${respuesta.status}`),
        respuesta.status,
        codigo,
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

export interface ArchivoDescargado {
  blob: Blob
  nombreArchivo: string
}

function nombreDesdeContentDisposition(cabecera: string | null, alterno: string): string {
  if (!cabecera) return alterno
  const coincidencia = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecera)
  return coincidencia?.[1] ? decodeURIComponent(coincidencia[1]) : alterno
}

/** Descarga binaria vía BFF (misma cookie de sesión); errores del backend en español. */
export async function peticionApiArchivo(
  ruta: string,
  alterno = 'archivo',
  opciones: RequestInit = {},
): Promise<ArchivoDescargado> {
  const respuesta = await fetch(`${URL_BASE_CLIENTE}${ruta}`, {
    ...opciones,
    credentials: 'include',
  })

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({ message: 'Error desconocido' }))
    throw new ErrorApi(
      Array.isArray(error.message) ? error.message.join(', ') : (error.message ?? `HTTP ${respuesta.status}`),
      respuesta.status,
    )
  }

  const blob = await respuesta.blob()
  const nombreArchivo = nombreDesdeContentDisposition(
    respuesta.headers.get('content-disposition'),
    alterno,
  )
  return { blob, nombreArchivo }
}

export { apiDisponible };
