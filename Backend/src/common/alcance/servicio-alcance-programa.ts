import { Injectable } from '@nestjs/common';
import { EstadoEvidencia, Prisma, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

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
  constructor(private readonly prisma: PrismaService) {}

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
    return construirFiltroVisibilidad(usuario, programasAsignados);
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

  // R-008.1b: las evidencias G3/G4 se asocian a la Institución (programaId NULL), así que
  // además de los programas asignados se incluye el alcance institucional.
  if (usuario.rol === RolUsuario.Cargador) {
    return {
      autorId: usuario.id,
      OR: [
        { programaId: { in: programasAsignados } },
        { institucionId: { not: null } },
      ],
    };
  }

  if (usuario.rol === RolUsuario.Revisor) {
    return {
      estado: { not: EstadoEvidencia.Borrador },
      OR: [
        { programaId: { in: programasAsignados } },
        { institucionId: { not: null } },
      ],
    };
  }

  return { id: { in: [] } };
}

export function rolPuedeDictaminar(rol: RolUsuario): boolean {
  return rol === RolUsuario.SuperAdmin || rol === RolUsuario.Revisor;
}
