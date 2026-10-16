// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { URL_BACKEND_DESARROLLO, apiDisponible, urlBackendInterna } from './config-api';

describe('config-api (despliegue Vercel)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa API_URL_INTERNAL y quita la barra final', () => {
    vi.stubEnv('API_URL_INTERNAL', 'https://siac-api.onrender.com/api/v1/');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://otra.example/api/v1');
    expect(urlBackendInterna()).toBe('https://siac-api.onrender.com/api/v1');
  });

  it('acepta NEXT_PUBLIC_API_URL como respaldo', () => {
    vi.stubEnv('API_URL_INTERNAL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://siac-api.onrender.com/api/v1');
    expect(urlBackendInterna()).toBe('https://siac-api.onrender.com/api/v1');
  });

  it('en desarrollo sin variables usa localhost', () => {
    vi.stubEnv('API_URL_INTERNAL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(urlBackendInterna()).toBe(URL_BACKEND_DESARROLLO);
  });

  it('en producción sin variables falla en lugar de llamar a localhost', () => {
    vi.stubEnv('API_URL_INTERNAL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => urlBackendInterna()).toThrow(/API_URL_INTERNAL/);
  });

  it('apiDisponible no depende de la URL del servidor (el navegador usa el BFF)', () => {
    vi.stubEnv('API_URL_INTERNAL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(apiDisponible()).toBe(true);
  });
});
