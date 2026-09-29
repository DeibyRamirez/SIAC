import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import {
  ALCANCE_PROGRAMA_KEY,
  OpcionesAlcancePrograma,
} from './alcance-programa.decorator';
import { ServicioAlcancePrograma } from './servicio-alcance-programa';

interface SolicitudAlcance {
  method: string;
  headers: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: { id: string; rol: RolUsuario };
}

/**
 * GuardAlcancePrograma relee UsuarioPrograma en cada petición.
 * En cargas multipart el cuerpo aún no está parseado (Multer corre después):
 * el servicio de evidencias vuelve a comprobar el programa.
 */
@Injectable()
export class GuardAlcancePrograma implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly alcance: ServicioAlcancePrograma,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const opciones = this.reflector.getAllAndOverride<OpcionesAlcancePrograma | undefined>(
      ALCANCE_PROGRAMA_KEY,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!opciones) {
      return true;
    }

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAlcance>();
    const usuario = solicitud.user;
    if (!usuario) {
      throw new ForbiddenException('No autenticado.');
    }
    if (usuario.rol === RolUsuario.SuperAdmin) {
      return true;
    }

    const modo =
      opciones.modo ??
      (solicitud.method === 'GET' || solicitud.method === 'HEAD' ? 'lectura' : 'escritura');

    if (opciones.parametroEvidencia) {
      const evidenciaId = solicitud.params[opciones.parametroEvidencia];
      if (!evidenciaId) {
        throw new ForbiddenException('Debe indicar la evidencia.');
      }
      const programaId = await this.alcance.programaDeEvidencia(evidenciaId);
      if (!programaId) {
        return true;
      }
      return this.autorizar(usuario, programaId, modo);
    }

    const programaId = this.resolverProgramaId(solicitud, opciones);
    if (!programaId) {
      if (modo === 'lectura') {
        return true;
      }
      const tipo = solicitud.headers['content-type'] ?? '';
      if (tipo.includes('multipart/form-data')) {
        return true;
      }
      throw new ForbiddenException('Debe indicar el programa.');
    }

    return this.autorizar(usuario, programaId, modo);
  }

  private async autorizar(
    usuario: { id: string; rol: RolUsuario },
    programaId: string,
    modo: 'lectura' | 'escritura',
  ): Promise<boolean> {
    if (
      modo === 'lectura' &&
      (usuario.rol === RolUsuario.Administrador || usuario.rol === RolUsuario.ParAcademico)
    ) {
      return true;
    }

    const asignado = await this.alcance.estaAsignado(usuario.id, programaId);
    if (!asignado) {
      throw new ForbiddenException('No tiene este programa asignado.');
    }
    return true;
  }

  private resolverProgramaId(
    solicitud: SolicitudAlcance,
    opciones: OpcionesAlcancePrograma,
  ): string | null {
    if (opciones.parametroPrograma) {
      const valor = solicitud.params[opciones.parametroPrograma];
      if (valor) return valor;
    }

    const desdeCuerpo = leerTexto(solicitud.body, opciones.campoCuerpo ?? 'programaId');
    if (opciones.campoCuerpo && desdeCuerpo) return desdeCuerpo;

    const desdeConsulta = leerTexto(solicitud.query, opciones.campoConsulta ?? 'programaId');
    if (opciones.campoConsulta && desdeConsulta) return desdeConsulta;

    return (
      solicitud.params.programaId ??
      leerTexto(solicitud.body, 'programaId') ??
      leerTexto(solicitud.query, 'programaId')
    );
  }
}

function leerTexto(
  origen: Record<string, unknown> | undefined,
  campo: string,
): string | null {
  const valor = origen?.[campo];
  return typeof valor === 'string' && valor.trim() ? valor : null;
}
