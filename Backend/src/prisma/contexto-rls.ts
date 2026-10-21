import { AsyncLocalStorage } from 'async_hooks';
import { RolUsuario } from '@prisma/client';

/**
 * Contexto de RLS de la petición o del proceso (plan-rls.md §3.2).
 * - `usuarioId`/`rol`: se envían a PostgreSQL con set_config(..., true) en cada transacción.
 * - `enTransaccion`: dentro de una transacción interactiva el contexto ya se fijó al inicio.
 * Sin rol no se fija nada y la RLS no devuelve filas (fallar cerrado).
 */
export type RolContextoRls = RolUsuario | 'sistema';

export interface ContextoRls {
  usuarioId?: string;
  rol?: RolContextoRls;
  enTransaccion?: boolean;
}

export const almacenContextoRls = new AsyncLocalStorage<ContextoRls>();

export function contextoRlsActual(): ContextoRls | undefined {
  return almacenContextoRls.getStore();
}

/** Abre un contexto vacío y mutable (lo usa el middleware al inicio de cada petición HTTP). */
export function ejecutarConContextoVacio<T>(fn: () => T): T {
  return almacenContextoRls.run({}, fn);
}

/**
 * Fija el usuario autenticado en el contexto abierto por el middleware. Solo acepta roles del
 * enum RolUsuario: el rol 'sistema' nunca puede venir de un JWT ni del login.
 */
export function fijarUsuarioEnContexto(usuarioId: string, rol: RolUsuario): void {
  if (!Object.values(RolUsuario).includes(rol)) {
    throw new Error(`Rol no válido para el contexto de RLS: ${String(rol)}`);
  }
  const contexto = almacenContextoRls.getStore();
  if (!contexto) return;
  contexto.usuarioId = usuarioId;
  contexto.rol = rol;
}

/** Ejecuta `fn` con un contexto distinto (copia), por ejemplo marcando una transacción abierta. */
export function ejecutarConContexto<T>(contexto: ContextoRls, fn: () => T): T {
  return almacenContextoRls.run({ ...contexto }, fn);
}
