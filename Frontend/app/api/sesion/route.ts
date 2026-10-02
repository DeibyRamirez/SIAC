import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  NOMBRE_COOKIE_SESION,
  urlBackendInterna,
} from '@/lib/servicios/config-api';

const MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 7;

function opcionesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SEGUNDOS,
  };
}

export async function POST(request: Request) {
  const cuerpo = await request.json();
  const respuesta = await fetch(`${urlBackendInterna()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    return NextResponse.json(datos, { status: respuesta.status });
  }

  const salida = NextResponse.json({ usuario: datos.usuario });
  salida.cookies.set(NOMBRE_COOKIE_SESION, datos.token, opcionesCookie());
  return salida;
}

export async function GET() {
  const almacen = await cookies();
  const token = almacen.get(NOMBRE_COOKIE_SESION)?.value;
  if (!token) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const respuesta = await fetch(`${urlBackendInterna()}/auth/perfil`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const datos = await respuesta.json().catch(() => ({}));
  return NextResponse.json(datos, { status: respuesta.status });
}

export async function DELETE() {
  const salida = NextResponse.json({ ok: true });
  salida.cookies.set(NOMBRE_COOKIE_SESION, '', {
    ...opcionesCookie(),
    maxAge: 0,
  });
  return salida;
}
