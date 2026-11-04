import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolUsuario } from '@prisma/client';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { ClaveIntegracionGuard, CABECERA_API_KEY } from './clave-integracion.guard';

/**
 * Acepta x-api-key (integrador) o JWT de Administrador/SuperAdmin.
 * Si hay x-api-key se valida esa vía y no se exige sesión.
 */
@Injectable()
export class ClaveOJwtGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly claveGuard: ClaveIntegracionGuard) {
    super();
  }

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { rol?: RolUsuario };
    }>();
    const crudo = peticion.headers[CABECERA_API_KEY];
    const secreto = Array.isArray(crudo) ? crudo[0] : crudo;
    if (secreto?.trim()) {
      return this.claveGuard.canActivate(contexto);
    }
    const crudoJwt = super.canActivate(contexto);
    const ok = await resolverActivacion(crudoJwt);
    if (!ok) return false;
    const rol = peticion.user?.rol;
    if (rol === RolUsuario.Administrador || rol === RolUsuario.SuperAdmin) return true;
    throw new UnauthorizedException('Se requiere clave de integración o sesión de Administrador.');
  }
}

function resolverActivacion(
  valor: boolean | Promise<boolean> | Observable<boolean>,
): Promise<boolean> {
  if (isObservable(valor)) return firstValueFrom(valor);
  return Promise.resolve(valor);
}
