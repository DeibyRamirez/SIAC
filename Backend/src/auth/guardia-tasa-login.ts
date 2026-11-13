import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * Límite de intentos de login por IP (ventana configurable). El contador usa `req.ip`
 * (con trust proxy documentado en confianza-proxy.ts); no usa cabeceras manipulables por el cliente
 * cuando la API no está detrás de un proxy de confianza.
 */
@Injectable()
export class GuardiaTasaLogin extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' && req.ip.length > 0 ? req.ip : 'sin-ip';
    return `login-ip:${ip}`;
  }

  protected async throwThrottlingException(
    _contexto: ExecutionContext,
    _detalle: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en un minuto.',
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
