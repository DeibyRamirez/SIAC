import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { NotificacionesDespachoService } from './notificaciones-despacho.service';
import { NotificacionesDestinatariosService } from './notificaciones-destinatarios.service';

type UmbralAvance = 'amarillo' | 'verde';

@Injectable()
export class NotificacionesAvanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly despacho: NotificacionesDespachoService,
    private readonly destinatarios: NotificacionesDestinatariosService,
  ) {}

  async evaluarUmbralesPrograma(
    programaId: string,
    avanceAnterior: number,
    avanceNuevo: number,
  ): Promise<void> {
    const config = await this.prisma.configuracionSIAC.findUnique({
      where: { id: 'global' },
    });
    if (!config) return;

    const programa = await this.prisma.programa.findUnique({
      where: { id: programaId },
      select: { nombre: true },
    });
    if (!programa) return;

    const umbrales: Array<{ clave: UmbralAvance; minimo: number }> = [
      { clave: 'amarillo', minimo: config.avanceMinimoAmarillo },
      { clave: 'verde', minimo: config.avanceMinimoVerde },
    ];

    for (const { clave, minimo } of umbrales) {
      if (avanceAnterior >= minimo || avanceNuevo < minimo) continue;
      const yaNotificado = await this.existeAlertaReciente(programaId, clave);
      if (yaNotificado) continue;

      const mensaje = `El programa "${programa.nombre}" alcanzó ${avanceNuevo.toFixed(1)}% de avance (umbral ${clave}: ${minimo}%).`;
      const metadata: Prisma.InputJsonValue = {
        programaId,
        umbral: clave,
        avance: avanceNuevo,
      };

      const destinatarios = await this.destinatarios.idsAdministradoresYPar();
      await this.despacho.notificarVarios(destinatarios, mensaje, 'avance', {
        asuntoCorreo: '[SIAC] Avance de programa',
        metadata,
      });
    }
  }

  private async existeAlertaReciente(
    programaId: string,
    umbral: UmbralAvance,
  ): Promise<boolean> {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recientes = await this.prisma.alertaInApp.findMany({
      where: {
        tipo: 'avance',
        createdAt: { gte: hace24h },
      },
      select: { metadata: true },
    });

    return recientes.some((fila) => {
      const meta = fila.metadata as { programaId?: string; umbral?: string } | null;
      return meta?.programaId === programaId && meta?.umbral === umbral;
    });
  }
}
