import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolUsuario } from '@prisma/client';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Comparación en tiempo constante de la clave de integración CIFRAS_API_KEY. */
export function claveApiValida(
  configuracion: ConfigService,
  encabezado: string | string[] | undefined,
): boolean {
  const recibida = (Array.isArray(encabezado) ? encabezado[0] : encabezado) ?? '';
  const esperada =
    configuracion.get<string>('cifrasApiKey') ??
    configuracion.get<string>('CIFRAS_API_KEY') ??
    '';
  if (!esperada || !recibida) return false;
  const hashRecibida = createHash('sha256').update(recibida).digest();
  const hashEsperada = createHash('sha256').update(esperada).digest();
  return timingSafeEqual(hashRecibida, hashEsperada);
}

/**
 * S3-03: autoriza el feed de datos con JWT de Administrador/SuperAdmin
 * o con el header x-api-key de integración.
 */
@Injectable()
export class CifrasDatosGuard implements CanActivate {
  constructor(private readonly configuracion: ConfigService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const solicitud = contexto.switchToHttp().getRequest<{
      user?: { rol?: RolUsuario };
      headers: Record<string, string | string[] | undefined>;
    }>();

    const rol = solicitud.user?.rol;
    if (rol === RolUsuario.Administrador || rol === RolUsuario.SuperAdmin) {
      return true;
    }

    if (claveApiValida(this.configuracion, solicitud.headers['x-api-key'])) {
      return true;
    }

    throw new UnauthorizedException(
      'Acceso denegado: se requiere token de Administrador o el header x-api-key de cifras.',
    );
  }
}
