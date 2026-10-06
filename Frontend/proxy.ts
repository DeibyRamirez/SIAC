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

/**
 * El proxy no debe ejecutarse en `/api/*`: Next 16 bufferiza el cuerpo de cada
 * petición que pasa por el proxy hasta `proxyClientMaxBodySize` (10 MB por defecto)
 * y trunca el resto en silencio. Las rutas `/api/sesion` y `/api/v1` (BFF) ya
 * gestionan la cookie por su cuenta, así que se excluyen del matcher (R-008.4a).
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
