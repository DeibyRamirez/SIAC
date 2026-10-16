// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { POST } from './route';

describe('BFF /api/sesion en producción (Vercel)', () => {
  const fetchOriginal = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    vi.unstubAllEnvs();
  });

  it('la cookie de sesión es httpOnly, Secure, SameSite=Lax y de primera parte', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_URL_INTERNAL', 'https://siac-api.onrender.com/api/v1');
    const espiaFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt', usuario: { id: 'u1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = espiaFetch as unknown as typeof fetch;

    const respuesta = await POST(
      new Request('https://siac.vercel.app/api/sesion', { method: 'POST', body: '{}' }),
    );

    expect(espiaFetch).toHaveBeenCalledWith(
      'https://siac-api.onrender.com/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    const cookie = (respuesta.headers.get('set-cookie') ?? '').toLowerCase();
    expect(cookie).toContain('siac_sesion=jwt');
    expect(cookie).toContain('httponly');
    expect(cookie).toContain('secure');
    expect(cookie).toContain('samesite=lax');
    // Sin atributo Domain: la cookie queda ligada al dominio de Vercel que sirvió la respuesta.
    expect(cookie).not.toContain('domain=');
  });
});
