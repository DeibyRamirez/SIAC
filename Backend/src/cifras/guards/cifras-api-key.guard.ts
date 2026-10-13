import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { claveApiValida } from './cifras-datos.guard';

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
    const esperada =
      this.configuracion.get<string>('cifrasApiKey') ??
      this.configuracion.get<string>('CIFRAS_API_KEY') ??
      '';

    if (!esperada) {
      throw new UnauthorizedException(
        'La ingesta por API no está configurada (falta CIFRAS_API_KEY en el entorno).',
      );
    }

    if (!claveApiValida(this.configuracion, encabezado)) {
      throw new UnauthorizedException('Clave de integración inválida o ausente.');
    }

    return true;
  }
}
