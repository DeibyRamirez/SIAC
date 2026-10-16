// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const almacenCookies = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nombre: string) =>
      almacenCookies.has(nombre) ? { name: nombre, value: almacenCookies.get(nombre) } : undefined,
  }),
}));

import { GET } from './route';

const TIPO_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function contexto(...ruta: string[]) {
  return { params: Promise.resolve({ ruta }) };
}

function peticionNavegador(ruta: string) {
  return new NextRequest(`http://localhost/api/v1/${ruta}`, {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
    },
  });
}

/**
 * Simula lo que entrega el fetch de Node cuando Render/Cloudflare responde con
 * `content-encoding: br`: el cuerpo ya viene descomprimido, pero las cabeceras
 * originales (`content-encoding` y el `content-length` comprimido) se conservan.
 */
function respuestaDescomprimida(cuerpo: BodyInit, cabeceras: Record<string, string>) {
  return new Response(cuerpo, {
    status: 200,
    headers: {
      'content-encoding': 'br',
      'content-length': '17',
      ...cabeceras,
    },
  });
}

describe('BFF /api/v1/[...ruta]: compresión de la respuesta del backend', () => {
  const fetchOriginal = globalThis.fetch;

  beforeEach(() => {
    almacenCookies.clear();
    almacenCookies.set('siac_sesion', 'jwt-vigente');
    process.env.API_URL_INTERNAL = 'http://backend.prueba/api/v1';
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    vi.restoreAllMocks();
    delete process.env.API_URL_INTERNAL;
  });

  it('no reenvía accept-encoding al backend y sí el token como Bearer', async () => {
    const espiaFetch = vi
      .fn()
      .mockResolvedValue(respuestaDescomprimida('[]', { 'content-type': 'application/json' }));
    globalThis.fetch = espiaFetch as unknown as typeof fetch;

    await GET(peticionNavegador('evidencias?pagina=1'), contexto('evidencias'));

    const [destino, init] = espiaFetch.mock.calls[0] as [string, RequestInit];
    expect(destino).toBe('http://backend.prueba/api/v1/evidencias?pagina=1');
    const enviadas = new Headers(init.headers);
    expect(enviadas.has('accept-encoding')).toBe(false);
    expect(enviadas.get('authorization')).toBe('Bearer jwt-vigente');
  });

  it('JSON con content-encoding: br: quita content-encoding y content-length y entrega el JSON intacto', async () => {
    const datos = { total: 2, elementos: [{ id: 'm1', nombre: 'Métrica año' }, { id: 'm2' }] };
    globalThis.fetch = vi.fn().mockResolvedValue(
      respuestaDescomprimida(JSON.stringify(datos), {
        'content-type': 'application/json; charset=utf-8',
        'transfer-encoding': 'chunked',
      }),
    ) as unknown as typeof fetch;

    const respuesta = await GET(peticionNavegador('panel/metricas'), contexto('panel', 'metricas'));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-encoding')).toBeNull();
    expect(respuesta.headers.get('content-length')).toBeNull();
    expect(respuesta.headers.get('transfer-encoding')).toBeNull();
    expect(respuesta.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await respuesta.json()).toEqual(datos);
  });

  it('descarga binaria .docx: bytes idénticos y conserva content-type y content-disposition', async () => {
    // Cabecera ZIP de un .docx seguida de bytes que no son UTF-8 válido.
    const bytes = new Uint8Array(4096);
    bytes.set([0x50, 0x4b, 0x03, 0x04]);
    for (let i = 4; i < bytes.length; i++) bytes[i] = (i * 37 + 11) % 256;
    const disposicion = 'attachment; filename="plantilla-informe.docx"';

    globalThis.fetch = vi.fn().mockResolvedValue(
      respuestaDescomprimida(bytes.slice(), {
        'content-type': TIPO_DOCX,
        'content-disposition': disposicion,
      }),
    ) as unknown as typeof fetch;

    const respuesta = await GET(
      peticionNavegador('plantillas/p1/contenido'),
      contexto('plantillas', 'p1', 'contenido'),
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-encoding')).toBeNull();
    expect(respuesta.headers.get('content-length')).toBeNull();
    expect(respuesta.headers.get('content-type')).toBe(TIPO_DOCX);
    expect(respuesta.headers.get('content-disposition')).toBe(disposicion);
    const recibidos = new Uint8Array(await respuesta.arrayBuffer());
    expect(recibidos.length).toBe(bytes.length);
    expect(Buffer.from(recibidos).equals(Buffer.from(bytes))).toBe(true);
  });

  it('propaga el estado de error del backend sin las cabeceras de compresión', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'No encontrado' }), {
        status: 404,
        headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' },
      }),
    ) as unknown as typeof fetch;

    const respuesta = await GET(peticionNavegador('evidencias/x'), contexto('evidencias', 'x'));

    expect(respuesta.status).toBe(404);
    expect(respuesta.headers.get('content-encoding')).toBeNull();
    expect(await respuesta.json()).toEqual({ message: 'No encontrado' });
  });
});
