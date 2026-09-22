import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoEvidencia } from '@prisma/client';

/** RN-001: Par académico / Administrador no accede a borradores ni rechazados */
@Injectable()
export class SoloValidadosGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const evidencia = request.evidencia ?? request.body;

    if (!evidencia) return true;

    const rol = request.user?.rol;
    const rolesSoloValidados = ['Administrador', 'ParAcademico'];
    if (rolesSoloValidados.includes(rol) && evidencia.estado !== EstadoEvidencia.Validado) {
      throw new ForbiddenException(
        'No tiene permiso para ver borradores.',
      );
    }

    return true;
  }
}
