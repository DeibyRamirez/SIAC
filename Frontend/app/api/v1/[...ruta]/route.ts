import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  NOMBRE_COOKIE_SESION,
  urlBackendInterna,
} from '@/lib/servicios/config-api';

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
    const normalizada = clave.toLowerCase();
    if (normalizada === 'host' || normalizada === 'cookie' || normalizada === 'connection') {
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
