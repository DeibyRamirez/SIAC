import {
  generarSecretoClaveIntegracion,
  hashearClaveIntegracion,
  hashesCoinciden,
} from './secreto-clave-integracion';
import { PREFIJO_CLAVE_INTEGRACION } from './categorias';

describe('secreto de clave de integración', () => {
  it('genera un secreto con prefijo y un hash SHA-256 de 64 hex', () => {
    const generado = generarSecretoClaveIntegracion();
    expect(generado.secreto.startsWith(PREFIJO_CLAVE_INTEGRACION)).toBe(true);
    expect(generado.hash).toHaveLength(64);
    expect(generado.hash).toBe(hashearClaveIntegracion(generado.secreto));
    expect(generado.prefijo).toBe(generado.secreto.slice(0, PREFIJO_CLAVE_INTEGRACION.length + 8));
  });

  it('compara hashes en tiempo constante y rechaza longitudes distintas', () => {
    const hash = hashearClaveIntegracion('siac_live_abc');
    expect(hashesCoinciden(hash, hash)).toBe(true);
    expect(hashesCoinciden(hash, hashearClaveIntegracion('otro'))).toBe(false);
    expect(hashesCoinciden(hash, 'corto')).toBe(false);
  });
});
