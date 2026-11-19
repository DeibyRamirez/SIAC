import type { NextFunction, Request, Response } from 'express';
import {
  compararEnTiempoConstante,
  credencialesValidas,
  crearMiddlewareBasicSwagger,
  esRutaSwagger,
  leerCredencialesBasic,
  resolverAccesoSwagger,
} from './acceso-swagger';

const CLAVE = 'clave-larga-de-prueba-2026';
const basic = (usuario: string, clave: string) =>
  `Basic ${Buffer.from(`${usuario}:${clave}`, 'utf8').toString('base64')}`;

interface RespuestaFalsa {
  statusCode: number;
  cuerpo: unknown;
  setHeader: jest.Mock;
  status: jest.Mock;
  json: jest.Mock;
}

function respuestaFalsa(): { res: RespuestaFalsa; cabeceras: Record<string, string> } {
  const cabeceras: Record<string, string> = {};
  const res: RespuestaFalsa = {
    statusCode: 200,
    cuerpo: undefined,
    setHeader: jest.fn((nombre: string, valor: string) => {
      cabeceras[nombre.toLowerCase()] = valor;
    }),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((codigo: number) => {
    res.statusCode = codigo;
    return res;
  });
  res.json.mockImplementation((cuerpo: unknown) => {
    res.cuerpo = cuerpo;
    return res;
  });
  return { res, cabeceras };
}

function ejecutar(url: string, authorization?: string) {
  const middleware = crearMiddlewareBasicSwagger({ usuario: 'docente', clave: CLAVE });
  const { res, cabeceras } = respuestaFalsa();
  const next = jest.fn() as unknown as NextFunction;
  middleware(
    { originalUrl: url, url, headers: authorization ? { authorization } : {} } as unknown as Request,
    res as unknown as Response,
    next,
  );
  return { res, cabeceras, next: next as unknown as jest.Mock };
}

describe('resolverAccesoSwagger', () => {
  it('fuera de producción monta Swagger sin autenticación (comportamiento actual)', () => {
    for (const NODE_ENV of ['development', 'test', undefined]) {
      expect(resolverAccesoSwagger({ NODE_ENV })).toEqual({ montar: true, credenciales: null, advertencias: [] });
    }
  });

  it('en producción no monta Swagger si no se habilita explícitamente', () => {
    expect(resolverAccesoSwagger({ NODE_ENV: 'production' }).montar).toBe(false);
    expect(resolverAccesoSwagger({ NODE_ENV: 'production', SWAGGER_HABILITADO: 'false' }).montar).toBe(false);
    expect(
      resolverAccesoSwagger({ NODE_ENV: 'production', SWAGGER_USUARIO: 'docente', SWAGGER_CLAVE: CLAVE }).montar,
    ).toBe(false);
  });

  it('en producción habilitado sin credenciales no monta y advierte', () => {
    const sinClave = resolverAccesoSwagger({ NODE_ENV: 'production', SWAGGER_HABILITADO: 'true', SWAGGER_USUARIO: 'docente' });
    expect(sinClave.montar).toBe(false);
    expect(sinClave.advertencias[0]).toMatch(/faltan SWAGGER_USUARIO o SWAGGER_CLAVE/);
    const sinUsuario = resolverAccesoSwagger({ NODE_ENV: 'production', SWAGGER_HABILITADO: 'true', SWAGGER_CLAVE: CLAVE });
    expect(sinUsuario.montar).toBe(false);
    expect(sinUsuario.advertencias).toHaveLength(1);
  });

  it('en producción rechaza claves cortas y nunca escribe la clave en la advertencia', () => {
    const acceso = resolverAccesoSwagger({
      NODE_ENV: 'production',
      SWAGGER_HABILITADO: 'true',
      SWAGGER_USUARIO: 'docente',
      SWAGGER_CLAVE: 'corta',
    });
    expect(acceso.montar).toBe(false);
    expect(acceso.advertencias.join(' ')).not.toContain('corta');
  });

  it('en producción habilitado con credenciales monta protegido', () => {
    expect(
      resolverAccesoSwagger({
        NODE_ENV: 'production',
        SWAGGER_HABILITADO: 'TRUE',
        SWAGGER_USUARIO: ' docente ',
        SWAGGER_CLAVE: CLAVE,
      }),
    ).toEqual({ montar: true, credenciales: { usuario: 'docente', clave: CLAVE }, advertencias: [] });
  });
});

describe('utilidades HTTP Basic', () => {
  it('compara en tiempo constante aunque las longitudes difieran', () => {
    expect(compararEnTiempoConstante('abc', 'abc')).toBe(true);
    expect(compararEnTiempoConstante('abc', 'abcd')).toBe(false);
    expect(compararEnTiempoConstante('', 'x')).toBe(false);
  });

  it('lee la cabecera Basic, incluida una clave con dos puntos', () => {
    expect(leerCredencialesBasic(basic('docente', 'a:b:c'))).toEqual({ usuario: 'docente', clave: 'a:b:c' });
    expect(leerCredencialesBasic(undefined)).toBeNull();
    expect(leerCredencialesBasic('Bearer abc.def')).toBeNull();
    expect(leerCredencialesBasic(`Basic ${Buffer.from('sin-separador').toString('base64')}`)).toBeNull();
  });

  it('valida usuario y clave a la vez', () => {
    const esperadas = { usuario: 'docente', clave: CLAVE };
    expect(credencialesValidas({ usuario: 'docente', clave: CLAVE }, esperadas)).toBe(true);
    expect(credencialesValidas({ usuario: 'docente', clave: 'otra' }, esperadas)).toBe(false);
    expect(credencialesValidas({ usuario: 'otro', clave: CLAVE }, esperadas)).toBe(false);
    expect(credencialesValidas(null, esperadas)).toBe(false);
  });

  it('reconoce las rutas de la documentación', () => {
    expect(esRutaSwagger('/api/docs')).toBe(true);
    expect(esRutaSwagger('/api/docs/')).toBe(true);
    expect(esRutaSwagger('/api/docs/swagger-ui.css')).toBe(true);
    expect(esRutaSwagger('/api/docs-json')).toBe(true);
    expect(esRutaSwagger('/api/docs-yaml')).toBe(true);
    expect(esRutaSwagger('/api/v1/salud')).toBe(false);
    expect(esRutaSwagger('/api/documentos')).toBe(false);
  });
});

describe('crearMiddlewareBasicSwagger', () => {
  it('responde 401 con WWW-Authenticate si no hay credenciales', () => {
    const { res, cabeceras, next } = ejecutar('/api/docs');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(cabeceras['www-authenticate']).toMatch(/^Basic realm="SIAC API Docs"/);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 con credenciales incorrectas, también en el JSON', () => {
    const { res, next } = ejecutar('/api/docs-json', basic('docente', 'incorrecta-123456'));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deja pasar con credenciales correctas y desactiva la caché', () => {
    const { res, cabeceras, next } = ejecutar('/api/docs/?x=1', basic('docente', CLAVE));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(cabeceras['cache-control']).toBe('no-store');
  });

  it('no interfiere con las rutas de la API', () => {
    const { res, next } = ejecutar('/api/v1/salud');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
