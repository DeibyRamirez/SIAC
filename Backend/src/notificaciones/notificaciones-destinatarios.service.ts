import { Injectable } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { idsGestionYRevisores } from './destinatarios-alertas';

@Injectable()
export class NotificacionesDestinatariosService {
  constructor(private readonly prisma: PrismaService) {}

  async idsRevisoresParaPrograma(programaId: string | null): Promise<string[]> {
    if (programaId) {
      const revisores = await this.prisma.usuario.findMany({
        where: {
          rol: RolUsuario.Revisor,
          usuarioProgramas: { some: { programaId } },
        },
        select: { id: true },
      });
      return revisores.map((r) => r.id);
    }

    const institucionales = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.Revisor,
        responsableProcesoInstitucional: true,
      },
      select: { id: true },
    });
    return institucionales.map((r) => r.id);
  }

  /**
   * Avisos de gestión (avance del programa): Administrador y SuperAdmin activos más los Revisores
   * activos asignados al programa. Sin Par académico (rol eliminado en HU-011).
   */
  idsGestionYRevisores(programaId: string): Promise<string[]> {
    return idsGestionYRevisores(this.prisma, programaId);
  }
}
