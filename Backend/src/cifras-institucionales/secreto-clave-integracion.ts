import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PREFIJO_CLAVE_INTEGRACION } from './categorias';

export function hashearClaveIntegracion(secreto: string): string {
  return createHash('sha256').update(secreto, 'utf8').digest('hex');
}

export function generarSecretoClaveIntegracion(): { secreto: string; prefijo: string; hash: string } {
  const secreto = `${PREFIJO_CLAVE_INTEGRACION}${randomBytes(24).toString('hex')}`;
  return {
    secreto,
    prefijo: secreto.slice(0, PREFIJO_CLAVE_INTEGRACION.length + 8),
    hash: hashearClaveIntegracion(secreto),
  };
}

export function hashesCoinciden(almacenado: string, recibido: string): boolean {
  const a = Buffer.from(almacenado, 'utf8');
  const b = Buffer.from(recibido, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
