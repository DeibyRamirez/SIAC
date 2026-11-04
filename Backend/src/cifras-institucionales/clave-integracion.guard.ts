import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClavesIntegracionService } from './claves-integracion.service';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';

export const CABECERA_API_KEY = 'x-api-key';

@Injectable()
export class ClaveIntegracionGuard implements CanActivate {
  constructor(private readonly claves: ClavesIntegracionService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      params?: { categoriaId?: string };
      claveIntegracion?: { id: string; nombre: string; categorias: string[] };
    }>();
    const crudo = peticion.headers[CABECERA_API_KEY];
    const secreto = Array.isArray(crudo) ? crudo[0] : crudo;
    const clave = await ejecutarComoSistema(() => this.claves.autenticar(secreto));
    if (!clave) {
      throw new UnauthorizedException('Clave de integración ausente o inválida.');
    }
    const categoriaId = peticion.params?.categoriaId;
    if (categoriaId && !clave.categorias.includes(categoriaId)) {
      throw new ForbiddenException(`La clave no puede escribir la categoría ${categoriaId}.`);
    }
    peticion.claveIntegracion = clave;
    return true;
  }
}
