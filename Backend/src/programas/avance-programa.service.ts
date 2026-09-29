import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';

@Injectable()
export class AvanceProgramaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avanceProceso: AvanceProcesoSIACService,
  ) {}

  /** Avance ponderado por trámite SIAC (Decreto 1330). Persiste el valor. */
  async recalcularPorcentajeAvance(programaId: string): Promise<number> {
    const progreso = await this.avanceProceso.calcularProgresoPrograma(programaId);

    await this.prisma.programa.update({
      where: { id: programaId },
      data: { porcentajeAvance: progreso.avanceGlobal },
    });

    return progreso.avanceGlobal;
  }
}
