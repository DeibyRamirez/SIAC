import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { buscarIntegradorPorHash, hashClaveApi, IntegradorActivo } from './claves/hash-clave';

const MENSAJE = 'Clave de API ausente o no válida.';

/**
 * Autentica x-api-key. Compara SHA-256 con timingSafeEqual y no registra la clave.
 * El último uso se marca con una función SECURITY DEFINER, sin devolver el hash al cliente.
 */
@Injectable()
export class GuardiaClaveApi implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const req = contexto.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      integrador?: { id: string; nombre: string };
    }>();
    const cruda = req.headers['x-api-key'];
    if (typeof cruda !== 'string' || cruda.length === 0 || cruda.length > 200) {
      throw new UnauthorizedException(MENSAJE);
    }

    const filas = await this.prisma.$queryRaw<IntegradorActivo[]>`
      SELECT "id", "nombre", "hashClave" FROM siac.integradores_activos()
    `;
    const activos = filas.map((fila) => ({ ...fila, hashClave: fila.hashClave.trim() }));
    const encontrado = buscarIntegradorPorHash(hashClaveApi(cruda), activos);
    if (!encontrado) throw new UnauthorizedException(MENSAJE);

    await this.prisma.$executeRaw`SELECT siac.marcar_uso_integrador(${encontrado.id})`;
    req.integrador = { id: encontrado.id, nombre: encontrado.nombre };
    return true;
  }
}
