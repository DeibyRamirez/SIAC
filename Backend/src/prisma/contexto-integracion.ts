import { ejecutarConContexto } from './contexto-rls';

/**
 * Contexto de RLS de la API de cifras (x-api-key). No es 'sistema': ese rol solo lo fija
 * contexto-sistema.ts. Las políticas de las tablas de cifras aceptan app.rol = 'integracion'.
 */
export function ejecutarComoIntegracion<T>(fn: () => Promise<T>): Promise<T> {
  return ejecutarConContexto({ usuarioId: 'integracion', rol: 'integracion' }, fn);
}
