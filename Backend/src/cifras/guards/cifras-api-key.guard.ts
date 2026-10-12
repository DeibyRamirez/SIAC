import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * HU-009: clave de integración para la ingesta de cifras por API.
 * Compara el header `x-api-key` contra CIFRAS_API_KEY en tiempo constante.
 */
@Injectable()
export class CifrasApiKeyGuard implements CanActivate {
  constructor(private readonly configuracion: ConfigService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const solicitud = contexto.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const encabezado = solicitud.headers['x-api-key'];
    const recibida = (Array.isArray(encabezado) ? encabezado[0] : encabezado) ?? '';
    const esperada =
      this.configuracion.get<string>('cifrasApiKey') ??
      this.configuracion.get<string>('CIFRAS_API_KEY') ??
      '';

    if (!esperada) {
      throw new UnauthorizedException(
        'La ingesta por API no está configurada (falta CIFRAS_API_KEY en el entorno).',
      );
    }

    if (!recibida) {
      throw new UnauthorizedException('Clave de integración inválida o ausente.');
    }

    const hashRecibida = createHash('sha256').update(recibida).digest();
    const hashEsperada = createHash('sha256').update(esperada).digest();
    if (!timingSafeEqual(hashRecibida, hashEsperada)) {
      throw new UnauthorizedException('Clave de integración inválida o ausente.');
    }

    return true;
  }
}
