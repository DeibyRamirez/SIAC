import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { EstadoEvidencia } from '@prisma/client';

@Injectable()
export class AvanceProgramaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Promedio de completitud por documento obligatorio (Decreto 1330). */
  async recalcularPorcentajeAvance(programaId: string): Promise<number> {
    const documentosObligatorios = await this.prisma.documentoRequerido.findMany({
      where: { obligatorio: true },
    });

    let porcentaje: number;

    if (documentosObligatorios.length === 0) {
      const evidencias = await this.prisma.evidencia.findMany({
        where: { programaId },
        select: { porcentajeCompletitud: true, estado: true },
      });
      if (evidencias.length === 0) {
        porcentaje = 0;
      } else {
        const suma = evidencias.reduce(
          (acc, ev) =>
            acc +
            (ev.estado === EstadoEvidencia.Validado
              ? 100
              : ev.porcentajeCompletitud),
          0,
        );
        porcentaje = Math.round(suma / evidencias.length);
      }
    } else {
      const evidencias = await this.prisma.evidencia.findMany({
        where: { programaId },
        orderBy: { updatedAt: 'desc' },
      });

      let sumaPorcentajes = 0;
      for (const doc of documentosObligatorios) {
        const evidencia = evidencias.find(
          (ev) => ev.documentoRequeridoId === doc.id,
        );
        if (!evidencia) {
          continue;
        }
        sumaPorcentajes +=
          evidencia.estado === EstadoEvidencia.Validado
            ? 100
            : evidencia.porcentajeCompletitud;
      }

      const total = documentosObligatorios.length;
      porcentaje =
        total === 0 ? 0 : Math.round(sumaPorcentajes / total);
    }

    await this.prisma.programa.update({
      where: { id: programaId },
      data: { porcentajeAvance: porcentaje },
    });

    return porcentaje;
  }
}
