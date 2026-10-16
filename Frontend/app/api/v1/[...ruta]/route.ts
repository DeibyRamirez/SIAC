import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  NOMBRE_COOKIE_SESION,
  urlBackendInterna,
} from '@/lib/servicios/config-api';

/**
 * Cabeceras de salto (hop-by-hop) o propias del navegador que no se reenvían al backend.
 * `expect: 100-continue` (curl y algunos clientes en cargas grandes) hace fallar el fetch de Node.
 * `accept-encoding` no se reenvía: el fetch de Node negocia su propia compresión con el
 * backend y entrega el cuerpo ya descomprimido; la compresión hacia el navegador la
 * decide la plataforma (Vercel), no el BFF.
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
  'accept-encoding',
]);

/**
 * Cabeceras de la respuesta del backend que no se copian al navegador.
 * El fetch de Node descomprime el cuerpo (br, gzip, deflate) pero conserva las cabeceras
 * originales: si se reenvían `content-encoding` y `content-length`, el navegador intenta
 * descomprimir un cuerpo que ya viene en claro y falla con ERR_CONTENT_DECODING_FAILED
 * (visto en producción con Render/Cloudflare respondiendo `content-encoding: br`).
 */
const CABECERAS_RESPUESTA_NO_REENVIABLES = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
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
    if (CABECERAS_RESPUESTA_NO_REENVIABLES.has(clave.toLowerCase())) {
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
