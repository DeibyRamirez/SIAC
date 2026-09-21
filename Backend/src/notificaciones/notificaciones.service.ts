import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  crear(usuarioId: string, mensaje: string, tipo = 'general') {
    return this.prisma.alertaInApp.create({
      data: { usuarioId, mensaje, tipo },
    });
  }

  listarPorUsuario(usuarioId: string) {
    return this.prisma.alertaInApp.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  marcarLeida(id: string, usuarioId: string) {
    return this.prisma.alertaInApp.updateMany({
      where: { id, usuarioId },
      data: { leida: true },
    });
  }
}
