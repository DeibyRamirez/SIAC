// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

function peticion(ruta: string, cookie?: string) {
  const cabeceras = new Headers();
  if (cookie) cabeceras.set('cookie', cookie);
  return new NextRequest(new URL(ruta, 'http://localhost:3000'), { headers: cabeceras });
}

/** Reproduce la evaluación del matcher de Next (regex anclada al pathname). */
function coincideMatcher(pathname: string): boolean {
  return config.matcher.some((patron) => new RegExp(`^${patron}$`).test(pathname));
}

describe('proxy.ts (R-008.4a / R-008.4b)', () => {
  it('redirige a /login?redirect= cuando falta la cookie en una ruta de la app', () => {
    const respuesta = proxy(peticion('/administrador/programas'));

    expect(respuesta.status).toBe(307);
    const destino = new URL(respuesta.headers.get('location') ?? '');
    expect(destino.pathname).toBe('/login');
    expect(destino.searchParams.get('redirect')).toBe('/administrador/programas');
  });

  it('deja pasar la ruta de la app cuando hay cookie de sesión', () => {
    const respuesta = proxy(peticion('/cargador/evidencias', 'siac_sesion=jwt'));

    expect(respuesta.headers.get('location')).toBeNull();
    expect(respuesta.headers.get('x-middleware-next')).toBe('1');
  });

  it('no redirige el login ni las rutas públicas', () => {
    expect(proxy(peticion('/login')).headers.get('location')).toBeNull();
    expect(proxy(peticion('/')).headers.get('location')).toBeNull();
  });

  it('el matcher excluye /api para que Next no trunque cargas grandes', () => {
    expect(coincideMatcher('/api/v1/evidencias')).toBe(false);
    expect(coincideMatcher('/api/v1/vigencias/con-archivo')).toBe(false);
    expect(coincideMatcher('/api/sesion')).toBe(false);
    expect(coincideMatcher('/_next/static/chunk.js')).toBe(false);
  });

  it('el matcher sigue cubriendo las rutas protegidas', () => {
    expect(coincideMatcher('/administrador/programas')).toBe(true);
    expect(coincideMatcher('/cargador/evidencias/nueva')).toBe(true);
    expect(coincideMatcher('/revisor/bandeja')).toBe(true);
    expect(coincideMatcher('/superadmin/usuarios')).toBe(true);
  });
});
