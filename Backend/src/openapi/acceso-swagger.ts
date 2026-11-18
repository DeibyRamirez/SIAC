import { createHash, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

type VariablesEntorno = Record<string, string | undefined>;

/** Ruta de la interfaz Swagger (fuera del prefijo global /api/v1). JSON en /api/docs-json, YAML en /api/docs-yaml. */
export const RUTA_SWAGGER = 'api/docs';

/** Longitud mínima de SWAGGER_CLAVE en producción (misma regla que PRIMER_ADMIN_CLAVE). */
export const LONGITUD_MINIMA_CLAVE_SWAGGER = 12;

export interface CredencialesSwagger {
  usuario: string;
  clave: string;
}

export interface AccesoSwagger {
  /** Si se monta la interfaz y el documento JSON/YAML. */
  montar: boolean;
  /** Credenciales HTTP Basic exigidas; `null` = sin protección (solo fuera de producción). */
  credenciales: CredencialesSwagger | null;
  /** Mensajes para el log de arranque (nunca incluyen la clave). */
  advertencias: string[];
}

function banderaActiva(valor: string | undefined): boolean {
  const normalizado = (valor ?? '').trim().toLowerCase();
  return normalizado === 'true' || normalizado === '1';
}

/**
 * Decide si se publica Swagger y con qué protección.
 * - Fuera de producción: se monta sin autenticación (comportamiento histórico, http://localhost:3001/api/docs).
 * - En producción: solo con SWAGGER_HABILITADO=true y protegido con HTTP Basic
 *   (SWAGGER_USUARIO / SWAGGER_CLAVE). Si falta alguna credencial o la clave es corta, no se monta.
 */
export function resolverAccesoSwagger(entorno: VariablesEntorno = process.env): AccesoSwagger {
  if (entorno.NODE_ENV !== 'production') {
    return { montar: true, credenciales: null, advertencias: [] };
  }
  if (!banderaActiva(entorno.SWAGGER_HABILITADO)) {
    return { montar: false, credenciales: null, advertencias: [] };
  }
  const usuario = entorno.SWAGGER_USUARIO?.trim() ?? '';
  const clave = entorno.SWAGGER_CLAVE ?? '';
  if (!usuario || !clave.trim()) {
    return {
      montar: false,
      credenciales: null,
      advertencias: [
        'SWAGGER_HABILITADO=true pero faltan SWAGGER_USUARIO o SWAGGER_CLAVE: Swagger no se publica en producción.',
      ],
    };
  }
  if (clave.length < LONGITUD_MINIMA_CLAVE_SWAGGER) {
    return {
      montar: false,
      credenciales: null,
      advertencias: [
        `SWAGGER_CLAVE debe tener al menos ${LONGITUD_MINIMA_CLAVE_SWAGGER} caracteres: Swagger no se publica en producción.`,
      ],
    };
  }
  return { montar: true, credenciales: { usuario, clave }, advertencias: [] };
}

/** Compara dos cadenas en tiempo constante (se comparan los SHA-256, de igual longitud). */
export function compararEnTiempoConstante(a: string, b: string): boolean {
  const resumenA = createHash('sha256').update(a, 'utf8').digest();
  const resumenB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(resumenA, resumenB);
}

/** Extrae usuario y clave de una cabecera `Authorization: Basic …`; `null` si no es válida. */
export function leerCredencialesBasic(cabecera: string | undefined): CredencialesSwagger | null {
  if (!cabecera) return null;
  const coincidencia = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(cabecera.trim());
  if (!coincidencia) return null;
  const decodificado = Buffer.from(coincidencia[1], 'base64').toString('utf8');
  const separador = decodificado.indexOf(':');
  if (separador < 0) return null;
  return { usuario: decodificado.slice(0, separador), clave: decodificado.slice(separador + 1) };
}

/** Comprueba usuario y clave sin cortocircuito (ambas comparaciones se ejecutan siempre). */
export function credencialesValidas(
  recibidas: CredencialesSwagger | null,
  esperadas: CredencialesSwagger,
): boolean {
  const usuario = recibidas?.usuario ?? '';
  const clave = recibidas?.clave ?? '';
  const usuarioOk = compararEnTiempoConstante(usuario, esperadas.usuario);
  const claveOk = compararEnTiempoConstante(clave, esperadas.clave);
  return recibidas !== null && usuarioOk && claveOk;
}

/** Indica si la ruta pertenece a la documentación (/api/docs, /api/docs/*, /api/docs-json, /api/docs-yaml). */
export function esRutaSwagger(ruta: string, base: string = RUTA_SWAGGER): boolean {
  const prefijo = `/${base.replace(/^\/+|\/+$/g, '')}`;
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`) || ruta.startsWith(`${prefijo}-`);
}

/**
 * Middleware Express que exige HTTP Basic en las rutas de Swagger.
 * Responde 401 con `WWW-Authenticate` para que el navegador pida usuario y clave.
 */
export function crearMiddlewareBasicSwagger(esperadas: CredencialesSwagger, base: string = RUTA_SWAGGER) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ruta = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (!esRutaSwagger(ruta, base)) {
      next();
      return;
    }
    if (credencialesValidas(leerCredencialesBasic(req.headers.authorization), esperadas)) {
      res.setHeader('Cache-Control', 'no-store');
      next();
      return;
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="SIAC API Docs", charset="UTF-8"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ statusCode: 401, message: 'Se requiere autenticación para la documentación de la API.' });
  };
}
