import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * S3-03: autenticación JWT opcional para el feed de cifras.
 * Con token válido deja `request.user`; sin token o con token inválido continúa
 * como anónimo (la autorización real la decide CifrasDatosGuard).
 */
@Injectable()
export class JwtOpcionalGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser {
    return (user ?? null) as TUser;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Sin token o token inválido: se evalúa el acceso por API key.
    }
    return true;
  }
}
