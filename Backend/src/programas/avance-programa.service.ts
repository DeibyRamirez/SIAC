import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';

@Injectable()
export class AvanceProgramaService {
  constructor(
    private readonly avanceProceso: AvanceProcesoSIACService,
    private readonly prisma: PrismaService,
  ) {}

  /** Avance ponderado por trámite SIAC (T-010). Solo calcula; no persiste columnas derivadas. */
  async recalcularPorcentajeAvance(programaId: string): Promise<number> {
    try {
      const progreso = await this.avanceProceso.calcularProgresoPrograma(programaId);

      await this.prisma.programa.update({
        where: { id: programaId },
        data: { porcentajeAvance: progreso.avanceGlobal },
      });

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
