import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  NOMBRE_COOKIE_SESION,
  urlBackendInterna,
} from '@/lib/servicios/config-api';

/**
 * Cabeceras de salto (hop-by-hop) o propias del navegador que no se reenvían al backend.
 * `expect: 100-continue` (curl y algunos clientes en cargas grandes) hace fallar el fetch de Node.
 */
const CABECERAS_NO_REENVIABLES = new Set([
  'host',
  'cookie',
  'connection',
  'keep-alive',
  'expect',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-connection',
]);

async function reenviar(
  request: NextRequest,
  context: { params: Promise<{ ruta: string[] }> },
) {
  const { ruta } = await context.params;
  const destinoPath = ruta.join('/');
  const url = new URL(request.url);
  const destino = `${urlBackendInterna()}/${destinoPath}${url.search}`;

  const almacen = await cookies();
  const token = almacen.get(NOMBRE_COOKIE_SESION)?.value;

  const cabeceras = new Headers();
  request.headers.forEach((valor, clave) => {
    if (CABECERAS_NO_REENVIABLES.has(clave.toLowerCase())) {
      return;
    }
    cabeceras.set(clave, valor);
  });

  if (token) {
    cabeceras.set('Authorization', `Bearer ${token}`);
  }

  const metodo = request.method;
  const cuerpo =
    metodo === 'GET' || metodo === 'HEAD' ? undefined : await request.arrayBuffer();

  const respuesta = await fetch(destino, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo,
  });

  const cabecerasSalida = new Headers();
  respuesta.headers.forEach((valor, clave) => {
    const normalizada = clave.toLowerCase();
    if (
      normalizada === 'transfer-encoding' ||
      normalizada === 'connection' ||
      normalizada === 'keep-alive'
    ) {
      return;
    }
    cabecerasSalida.set(clave, valor);
  });

  return new NextResponse(respuesta.body, {
    status: respuesta.status,
    headers: cabecerasSalida,
  });
}

export const GET = reenviar;
export const POST = reenviar;
export const PATCH = reenviar;
export const PUT = reenviar;
export const DELETE = reenviar;
