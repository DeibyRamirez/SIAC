import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plantillaAvanceUmbral } from '../correo/plantillas';
import { PrismaService } from '../prisma/prisma.module';
import { claveAvance } from './claves-evento';
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

      const mensaje = `El programa "${programa.nombre}" alcanzó ${avanceNuevo.toFixed(1)}% de avance (umbral ${clave}: ${minimo}%).`;
      const metadata: Prisma.InputJsonValue = {
        programaId,
        umbral: clave,
        avance: avanceNuevo,
      };
      const plantilla = plantillaAvanceUmbral({
        nombrePrograma: programa.nombre,
        avance: avanceNuevo,
        umbral: clave,
        minimo,
        programaId,
      });

      // T-007.3c: la idempotencia la da la clave única del evento (ya no hay dedup por metadata).
      const destinatarios = [...new Set(await this.destinatarios.idsAdministradoresYPar())];
      for (const usuarioId of destinatarios) {
        await this.despacho.notificar({
          claveEvento: claveAvance(programaId, clave, usuarioId),
          usuarioId,
          mensaje,
          tipo: 'avance',
          asuntoCorreo: plantilla.asunto,
          metadata,
          plantilla,
        });
      }
    }
  }
}
