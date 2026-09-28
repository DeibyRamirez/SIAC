import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { EstadoEvidencia } from '@prisma/client';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';

export interface EvidenciaParaAvance {
  documentoRequeridoId: string | null;
  porcentajeCompletitud: number;
  estado: EstadoEvidencia;
  updatedAt?: Date;
}

/** Promedio de completitud. No escribe en la base. */
export function calcularPorcentajeEnMemoria(
  evidencias: EvidenciaParaAvance[],
  idsDocumentosObligatorios: string[],
): number {
  if (idsDocumentosObligatorios.length === 0) {
    if (evidencias.length === 0) return 0;
    const suma = evidencias.reduce(
      (acc, evidencia) =>
        acc +
        (evidencia.estado === EstadoEvidencia.Validado ? 100 : evidencia.porcentajeCompletitud),
      0,
    );
    return Math.round(suma / evidencias.length);
  }

  const ordenadas = [...evidencias].sort(
    (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
  );
  let sumaPorcentajes = 0;
  for (const documentoId of idsDocumentosObligatorios) {
    const evidencia = ordenadas.find((item) => item.documentoRequeridoId === documentoId);
    if (!evidencia) continue;
    sumaPorcentajes +=
      evidencia.estado === EstadoEvidencia.Validado ? 100 : evidencia.porcentajeCompletitud;
  }
  return Math.round(sumaPorcentajes / idsDocumentosObligatorios.length);
}

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
