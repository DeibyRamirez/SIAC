import { Injectable } from '@nestjs/common';
import { EstadoEvidencia, Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { UsuarioRepositorio } from '../../usuarios/usuario.repositorio';

export interface UsuarioAlcance {
  id: string;
  rol: RolUsuario;
}

/**
 * Alcance por programa (RN-001 ajustada).
 * Los programas asignados se leen de la base en cada llamada: no viajan en el JWT (P28).
 */
@Injectable()
export class ServicioAlcancePrograma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarioRepo: UsuarioRepositorio,
  ) {}

  idsProgramasAsignados(usuarioId: string): Promise<string[]> {
    return this.prisma.usuarioPrograma
      .findMany({
        where: { usuarioId },
        select: { programaId: true },
      })
      .then((filas) => filas.map((fila) => fila.programaId));
  }

  async estaAsignado(usuarioId: string, programaId: string): Promise<boolean> {
    const vinculo = await this.prisma.usuarioPrograma.findUnique({
      where: { usuarioId_programaId: { usuarioId, programaId } },
      select: { id: true },
    });
    return vinculo !== null;
  }

  async programaDeEvidencia(evidenciaId: string): Promise<string | null> {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id: evidenciaId },
      select: { programaId: true },
    });
    return evidencia?.programaId ?? null;
  }

  async filtroVisibilidad(usuario: UsuarioAlcance): Promise<Prisma.EvidenciaWhereInput> {
    const restringePorPrograma =
      usuario.rol === RolUsuario.Cargador || usuario.rol === RolUsuario.Revisor;
    const programasAsignados = restringePorPrograma
      ? await this.idsProgramasAsignados(usuario.id)
      : [];
    const responsableProcesoInstitucional = restringePorPrograma
      ? await this.usuarioRepo.esResponsableProcesoInstitucional(usuario.id)
      : false;
    return construirFiltroVisibilidad(
      usuario,
      programasAsignados,
      responsableProcesoInstitucional,
    );
  }

  async esResponsableProcesoInstitucional(usuarioId: string): Promise<boolean> {
    return this.usuarioRepo.esResponsableProcesoInstitucional(usuarioId);
  }
}

/**
 * RN-001 ajustada.
 * El borrador de un documento ya revisado se reconoce por el historial
 * (aún no existe `numeroRevisionActual`; llega con T-003.3).
 */
export function construirFiltroVisibilidad(
  usuario: UsuarioAlcance,
  programasAsignados: string[],
  responsableProcesoInstitucional = false,
): Prisma.EvidenciaWhereInput {
  if (usuario.rol === RolUsuario.SuperAdmin) {
    return {};
  }

  if (usuario.rol === RolUsuario.ParAcademico) {
    return { estado: EstadoEvidencia.Validado };
  }

  if (usuario.rol === RolUsuario.Administrador) {
    return {
      OR: [
        { estado: { not: EstadoEvidencia.Borrador } },
        {
          historial: {
            some: { estado: { not: EstadoEvidencia.Borrador } },
          },
        },
      ],
    };
  }

  if (usuario.rol === RolUsuario.Cargador) {
    const condiciones: Prisma.EvidenciaWhereInput[] = [];
    if (programasAsignados.length > 0) {
      condiciones.push({ programaId: { in: programasAsignados } });
    }
    if (responsableProcesoInstitucional) {
      condiciones.push({ institucionId: { not: null } });
    }
    if (condiciones.length === 0) {
      return { id: { in: [] } };
    }
    return {
      autorId: usuario.id,
      OR: condiciones,
    };
  }

  if (usuario.rol === RolUsuario.Revisor) {
    const condiciones: Prisma.EvidenciaWhereInput[] = [];
    if (programasAsignados.length > 0) {
      condiciones.push({ programaId: { in: programasAsignados } });
    }
    if (responsableProcesoInstitucional) {
      condiciones.push({ institucionId: { not: null } });
    }
    if (condiciones.length === 0) {
      return { id: { in: [] } };
    }
    return {
      estado: { not: EstadoEvidencia.Borrador },
      OR: condiciones,
    };
  }

  return { id: { in: [] } };
}

export function rolPuedeDictaminar(rol: RolUsuario): boolean {
  return rol === RolUsuario.SuperAdmin || rol === RolUsuario.Revisor;
}
