import { Injectable } from '@nestjs/common';
import { EstadoNotificacionSalida, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

export interface ConsultaSalida {
  estado?: EstadoNotificacionSalida;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  crear(
    usuarioId: string,
    mensaje: string,
    tipo = 'general',
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.alertaInApp.create({
      data: { usuarioId, mensaje, tipo, metadata },
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

  marcarTodasLeidas(usuarioId: string) {
    return this.prisma.alertaInApp.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
  }

  /**
   * C-8 (T-007.3e): bitácora del outbox de correo, paginada y sin `payload` sensible
   * (el detalle del correo no sale de la BD).
   */
  async listarSalida(consulta: ConsultaSalida) {
    const page = consulta.page ?? 1;
    const limit = consulta.limit ?? 20;
    const where: Prisma.NotificacionSalidaWhereInput = consulta.estado
      ? { estado: consulta.estado }
      : {};

    const [total, datos] = await Promise.all([
      this.prisma.notificacionSalida.count({ where }),
      this.prisma.notificacionSalida.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          claveEvento: true,
          usuarioId: true,
          canal: true,
          tipo: true,
          estado: true,
          intentos: true,
          ultimoError: true,
          proximoIntentoAt: true,
          enviadoAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      datos,
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
    };
  }
}
