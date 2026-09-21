const URL_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public codigoEstado: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

function obtenerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('siac-token-jwt');
}

export function guardarToken(token: string): void {
  localStorage.setItem('siac-token-jwt', token);
}

export function eliminarToken(): void {
  localStorage.removeItem('siac-token-jwt');
}

export async function peticionApi<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const token = obtenerToken();
  const headers: Record<string, string> = {
    ...(opciones.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(opciones.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers,
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
}

export function apiDisponible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1');
}
