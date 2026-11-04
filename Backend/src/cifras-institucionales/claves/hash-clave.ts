import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const HASH_FICTICIO = '0'.repeat(64);

export interface IntegradorActivo {
  id: string;
  nombre: string;
  hashClave: string;
}

/** SHA-256 en hexadecimal. La clave en claro no se guarda ni se escribe en logs. */
export function hashClaveApi(clave: string): string {
  return createHash('sha256').update(clave).digest('hex');
}

export function generarClaveApi(): { clave: string; hashClave: string } {
  const clave = `siac_${randomBytes(32).toString('base64url')}`;
  return { clave, hashClave: hashClaveApi(clave) };
}

export function hashesIguales(izquierda: string, derecha: string): boolean {
  const a = Buffer.from(izquierda);
  const b = Buffer.from(derecha);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Compara el hash recibido con cada hash activo usando timingSafeEqual.
 * Recorre siempre toda la lista. Si no hay integradores, compara contra un hash fijo.
 */
export function buscarIntegradorPorHash(
  hashRecibido: string,
  activos: readonly IntegradorActivo[],
): IntegradorActivo | null {
  const candidatos = activos.length > 0 ? activos : [{ id: '', nombre: '', hashClave: HASH_FICTICIO }];
  let encontrado: IntegradorActivo | null = null;
  for (const candidato of candidatos) {
    if (hashesIguales(hashRecibido, candidato.hashClave) && candidato.id) {
      encontrado = candidato;
    }
  }
  return encontrado;
}
