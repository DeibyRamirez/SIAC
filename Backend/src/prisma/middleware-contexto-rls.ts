import { Injectable, NestMiddleware } from '@nestjs/common';
import { ejecutarConContextoVacio } from './contexto-rls';

/**
 * Abre un contexto de RLS vacío por petición. La estrategia JWT (o el login) lo completa con el
 * usuario autenticado; las rutas públicas quedan sin contexto y la BD no les devuelve filas.
 */
@Injectable()
export class MiddlewareContextoRls implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: () => void): void {
    ejecutarConContextoVacio(() => next());
  }
}
