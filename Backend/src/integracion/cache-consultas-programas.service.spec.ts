import { ConfigService } from '@nestjs/config';
import { CacheConsultasProgramasService } from './cache-consultas-programas.service';
import { RolUsuario } from '@prisma/client';

describe('CacheConsultasProgramasService', () => {
  function crearServicio(ttlSeg = 45): CacheConsultasProgramasService {
    const config = {
      get: (clave: string) => (clave === 'PROGRAMAS_RESPUESTA_CACHE_TTL_SEG' ? String(ttlSeg) : undefined),
    } as ConfigService;
    return new CacheConsultasProgramasService(config);
  }

  it('guarda y devuelve respuesta de panel hasta expirar', () => {
    const cache = crearServicio();
    const usuario = { id: 'u1', rol: RolUsuario.Administrador };
    const clave = cache.clavePanel({ page: 1 }, usuario);
    const respuesta = { datos: [], total: 0, page: 1, limit: 20, totalPaginas: 0 };

    expect(cache.leerPanel(clave)).toBeNull();
    cache.guardarPanel(clave, respuesta);
    expect(cache.leerPanel(clave)).toEqual(respuesta);
  });

  it('invalidarTodo limpia panel, listado y filtros CUAC', () => {
    const cache = crearServicio();
    const usuario = { id: 'u1', rol: RolUsuario.Administrador };
    cache.guardarListado(cache.claveListado(usuario), [{ id: 'p1' }]);
    cache.guardarFiltrosCatalogo({ niveles: ['Pregrado'], facultades: [], modalidades: [] });

    cache.invalidarTodo();

    expect(cache.leerListado(cache.claveListado(usuario))).toBeNull();
    expect(cache.leerFiltrosCatalogo()).toBeNull();
  });

  it('acota TTL entre 30 y 60 segundos', () => {
    expect(crearServicio(10).ttlSegundos()).toBe(30);
    expect(crearServicio(120).ttlSegundos()).toBe(60);
    expect(crearServicio(45).ttlSegundos()).toBe(45);
  });
});
