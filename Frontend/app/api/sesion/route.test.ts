// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const almacenCookies = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nombre: string) =>
      almacenCookies.has(nombre) ? { name: nombre, value: almacenCookies.get(nombre) } : undefined,
  }),
}));

import { DELETE, GET, POST } from './route';

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BFF /api/sesion (R-008.4b)', () => {
  const fetchOriginal = globalThis.fetch;

  beforeEach(() => {
    almacenCookies.clear();
    process.env.API_URL_INTERNAL = 'http://backend.prueba/api/v1';
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    vi.restoreAllMocks();
    delete process.env.API_URL_INTERNAL;
  });

  it('POST fija la cookie siac_sesion httpOnly con SameSite=Lax y no devuelve el token', async () => {
    const espiaFetch = vi.fn().mockResolvedValue(
      respuestaJson({ token: 'jwt-prueba', usuario: { id: 'u1', rol: 'Administrador' } }),
    );
    globalThis.fetch = espiaFetch as unknown as typeof fetch;

    const respuesta = await POST(
      new Request('http://localhost/api/sesion', {
        method: 'POST',
        body: JSON.stringify({ correo: 'admin@uniautonoma.edu.co', contrasena: 'x' }),
      }),
    );

    expect(espiaFetch).toHaveBeenCalledWith(
      'http://backend.prueba/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(respuesta.status).toBe(200);
    const cabeceraCookie = respuesta.headers.get('set-cookie') ?? '';
    expect(cabeceraCookie).toContain('siac_sesion=jwt-prueba');
    expect(cabeceraCookie.toLowerCase()).toContain('httponly');
    expect(cabeceraCookie.toLowerCase()).toContain('samesite=lax');
    expect(cabeceraCookie).toContain('Path=/');
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ usuario: { id: 'u1', rol: 'Administrador' } });
    expect(JSON.stringify(cuerpo)).not.toContain('jwt-prueba');
  });

  it('POST con credenciales inválidas propaga el estado y no fija cookie', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(respuestaJson({ message: 'Credenciales inválidas' }, 401)) as unknown as typeof fetch;

    const respuesta = await POST(
      new Request('http://localhost/api/sesion', { method: 'POST', body: '{}' }),
    );

    expect(respuesta.status).toBe(401);
    expect(respuesta.headers.get('set-cookie')).toBeNull();
  });

  it('GET sin cookie responde 401 sin llamar al backend', async () => {
    const espiaFetch = vi.fn();
    globalThis.fetch = espiaFetch as unknown as typeof fetch;

    const respuesta = await GET();

    expect(respuesta.status).toBe(401);
    expect(espiaFetch).not.toHaveBeenCalled();
  });

  it('GET con cookie reenvía el token como Bearer al perfil', async () => {
    almacenCookies.set('siac_sesion', 'jwt-vigente');
    const espiaFetch = vi.fn().mockResolvedValue(respuestaJson({ id: 'u1' }));
    globalThis.fetch = espiaFetch as unknown as typeof fetch;

    const respuesta = await GET();

    expect(respuesta.status).toBe(200);
    expect(espiaFetch).toHaveBeenCalledWith('http://backend.prueba/api/v1/auth/perfil', {
      headers: { Authorization: 'Bearer jwt-vigente' },
    });
  });

  it('DELETE borra la cookie con Max-Age=0', async () => {
    const respuesta = await DELETE();

    const cabeceraCookie = respuesta.headers.get('set-cookie') ?? '';
    expect(cabeceraCookie).toContain('siac_sesion=');
    expect(cabeceraCookie).toContain('Max-Age=0');
    expect(cabeceraCookie.toLowerCase()).toContain('httponly');
  });
});
