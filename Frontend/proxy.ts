import { NextRequest, NextResponse } from 'next/server';
import { NOMBRE_COOKIE_SESION } from '@/lib/servicios/config-api';

const RUTAS_PUBLICAS = ['/login', '/api/sesion', '/api/v1'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    RUTAS_PUBLICAS.some(
      (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
    )
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const tieneSesion = Boolean(request.cookies.get(NOMBRE_COOKIE_SESION)?.value);
  const esRutaApp =
    pathname.startsWith('/administrador') ||
    pathname.startsWith('/cargador') ||
    pathname.startsWith('/revisor') ||
    pathname.startsWith('/superadmin');

  if (esRutaApp && !tieneSesion) {
    const login = new URL('/login', request.url);
    login.searchParams.set('redirect', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
