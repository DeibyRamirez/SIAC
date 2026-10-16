import { Injectable } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

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

  async idsAdministradoresYPar(): Promise<string[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        rol: { in: [RolUsuario.Administrador, RolUsuario.ParAcademico] },
      },
      select: { id: true },
    });
    return usuarios.map((u) => u.id);
  }
}
