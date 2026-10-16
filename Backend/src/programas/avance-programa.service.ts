import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { NotificacionesAvanceService } from '../notificaciones/notificaciones-avance.service';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';

@Injectable()
export class AvanceProgramaService {
  constructor(
    private readonly avanceProceso: AvanceProcesoSIACService,
    private readonly prisma: PrismaService,
    private readonly notificacionesAvance: NotificacionesAvanceService,
  ) {}

  /** Avance ponderado por trámite SIAC (T-010). Solo calcula; no persiste columnas derivadas. */
  async recalcularPorcentajeAvance(programaId: string): Promise<number> {
    try {
      const programaPrevio = await this.prisma.programa.findUnique({
        where: { id: programaId },
        select: { porcentajeAvance: true },
      });
      const avanceAnterior = programaPrevio?.porcentajeAvance ?? 0;

      const progreso = await this.avanceProceso.calcularProgresoPrograma(programaId);

      await this.prisma.programa.update({
        where: { id: programaId },
        data: { porcentajeAvance: progreso.avanceGlobal },
      });

      await this.notificacionesAvance.evaluarUmbralesPrograma(
        programaId,
        avanceAnterior,
        progreso.avanceGlobal,
      );

      return progreso.avanceGlobal;
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('not found in enum')
      ) {
        const programa = await this.prisma.programa.findUnique({
          where: { id: programaId },
          select: { porcentajeAvance: true },
        });
        return programa?.porcentajeAvance ?? 0;
      }
      throw err;
    }
  }
}
