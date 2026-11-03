import { buscarIntegradorPorHash, generarClaveApi, hashClaveApi, hashesIguales } from './hash-clave';

describe('claves de integrador', () => {
  it('guarda solo el SHA-256 y compara con buffers del mismo tamaño', () => {
    const { clave, hashClave } = generarClaveApi();
    expect(clave.startsWith('siac_')).toBe(true);
    expect(clave).not.toBe(hashClave);
    expect(hashClave).toHaveLength(64);
    expect(hashClaveApi(clave)).toBe(hashClave);
    expect(hashesIguales(hashClave, hashClaveApi(clave))).toBe(true);
    expect(hashesIguales(hashClave, 'a'.repeat(64))).toBe(false);
    expect(hashesIguales(hashClave, 'corto')).toBe(false);
  });

  it('encuentra el integrador activo y no elige un hash de otra longitud', () => {
    const primera = generarClaveApi();
    const segunda = generarClaveApi();
    const activos = [
      { id: 'int-1', nombre: 'SIGA', hashClave: primera.hashClave },
      { id: 'int-2', nombre: 'Otro', hashClave: segunda.hashClave },
    ];
    expect(buscarIntegradorPorHash(primera.hashClave, activos)?.id).toBe('int-1');
    expect(buscarIntegradorPorHash('b'.repeat(64), activos)).toBeNull();
    expect(buscarIntegradorPorHash(primera.hashClave, [])).toBeNull();
  });
});
