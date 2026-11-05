import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * 30 POST y 120 GET por minuto. El contador usa el SHA-256 de x-api-key, nunca la clave.
 * Sin cabecera, el contador es la IP para no mezclar anónimos con un integrador.
 */
@Injectable()
export class GuardiaTasaCifras extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req.headers as Record<string, string | string[] | undefined> | undefined;
    const cruda = headers?.['x-api-key'];
    if (typeof cruda === 'string' && cruda.length > 0 && cruda.length <= 200) {
      return createHash('sha256').update(cruda).digest('hex');
    }
    const ip = typeof req.ip === 'string' && req.ip ? req.ip : 'sin-ip';
    return `ip:${ip}`;
  }

  protected async throwThrottlingException(
    _contexto: ExecutionContext,
    _detalle: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Demasiadas solicitudes para esta clave. Intente de nuevo en un minuto.',
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
