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
 * Regla de borradores (20/10/2026): un documento en estado Borrador solo lo ve quien lo subió
 * (`autorId`), sin excepción para Administrador ni SuperAdmin. Se combina con el alcance por rol.
 */
export function filtroBorradorSoloAutor(usuarioId: string): Prisma.EvidenciaWhereInput {
  return {
    OR: [{ estado: { not: EstadoEvidencia.Borrador } }, { autorId: usuarioId }],
  };
}

/** ¿Puede este usuario ver la evidencia según la regla de borradores? */
export function puedeVerBorrador(
  evidencia: { estado: EstadoEvidencia; autorId: string },
  usuarioId: string,
): boolean {
  return evidencia.estado !== EstadoEvidencia.Borrador || evidencia.autorId === usuarioId;
}

/**
 * RN-001 ajustada: alcance por rol (programas asignados / responsable institucional) más la
 * regla de borradores solo visibles para su autor.
 */
export function construirFiltroVisibilidad(
  usuario: UsuarioAlcance,
  programasAsignados: string[],
  responsableProcesoInstitucional = false,
): Prisma.EvidenciaWhereInput {
  const alcance = construirFiltroAlcanceRol(usuario, programasAsignados, responsableProcesoInstitucional);
  if (alcance === null) return { id: { in: [] } };
  return { AND: [alcance, filtroBorradorSoloAutor(usuario.id)] };
}

function construirFiltroAlcanceRol(
  usuario: UsuarioAlcance,
  programasAsignados: string[],
  responsableProcesoInstitucional: boolean,
): Prisma.EvidenciaWhereInput | null {
  if (usuario.rol === RolUsuario.SuperAdmin || usuario.rol === RolUsuario.Administrador) {
    return {};
  }

  if (usuario.rol === RolUsuario.Cargador || usuario.rol === RolUsuario.Revisor) {
    const condiciones: Prisma.EvidenciaWhereInput[] = [];
    if (programasAsignados.length > 0) {
      condiciones.push({ programaId: { in: programasAsignados } });
    }
    if (responsableProcesoInstitucional) {
      condiciones.push({ institucionId: { not: null } });
    }
    if (condiciones.length === 0) return null;
    // El Cargador solo ve lo que él mismo subió; el Revisor ve lo de su alcance (sin borradores ajenos).
    return usuario.rol === RolUsuario.Cargador
      ? { autorId: usuario.id, OR: condiciones }
      : { OR: condiciones };
  }

  return null;
}

export function rolPuedeDictaminar(rol: RolUsuario): boolean {
  return rol === RolUsuario.SuperAdmin || rol === RolUsuario.Revisor;
}
