import { Injectable, NotFoundException } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, Prisma, TipoTramiteSIAC } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { ETIQUETAS_GUIA, tramitePorTipo } from './catalogo-tramites-siac';

export interface DocumentoProgresoSIAC {
  codigoGuia: CodigoDocumentoGuia;
  nombre: string;
  peso: number;
  porcentajeInterno: number;
  aportacion: number;
  /** Estado de la evidencia más reciente de la guía (null si no hay carga). */
  estado: EstadoEvidencia | null;
  /** Puntaje entero n de la última verificación con checklist (G1 n/9, G3 n/6). */
  puntaje: number | null;
  totalCondiciones: number | null;
  /** Cumple (checklist completo) o Validado (decisión explícita). */
  aceptado: boolean;
  /** Checklist con condiciones pendientes (n < total). */
  conObservaciones: boolean;
  /** Solo por decisión explícita del Revisor (HU-006). */
  rechazado: boolean;
}

export interface ProgresoProcesoSIAC {
  /** Presente cuando el trámite es de un programa (G1/G2). */
  programaId?: string;
  /** Presente cuando el trámite es de la institución (G3/G4). */
  institucionId?: string;
  tipoTramite: TipoTramiteSIAC;
  avanceGlobal: number;
  documentosAceptados: number;
  documentosTotal: number;
  documentos: DocumentoProgresoSIAC[];
}

interface EvidenciaParaProgreso {
  documentoRequeridoId: string | null;
  codigoGuia: CodigoDocumentoGuia | null;
  estado: EstadoEvidencia;
  puntajeActual: number | null;
  totalCondicionesActual: number | null;
}

const SELECCION_EVIDENCIA_PROGRESO = {
  documentoRequeridoId: true,
  codigoGuia: true,
  estado: true,
  puntajeActual: true,
  totalCondicionesActual: true,
  updatedAt: true,
} satisfies Prisma.EvidenciaSelect;

@Injectable()
export class AvanceProcesoSIACService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularProgresoPrograma(programaId: string): Promise<ProgresoProcesoSIAC> {
    const programa = await this.prisma.programa.findUnique({ where: { id: programaId } });
    if (!programa) throw new NotFoundException('Programa no encontrado.');

    const evidencias = await this.prisma.evidencia.findMany({
      where: { programaId },
      select: SELECCION_EVIDENCIA_PROGRESO,
      orderBy: { updatedAt: 'desc' },
    });

    const progreso = await this.construirProgreso(programa.tipoTramiteActivo, evidencias);
    return { programaId, ...progreso };
  }

  /** HU-010: avance del trámite institucional (G3/G4), sin atribuirlo a ninguna carrera. */
  async calcularProgresoInstitucion(institucionId: string): Promise<ProgresoProcesoSIAC> {
    const institucion = await this.prisma.institucion.findUnique({
      where: { id: institucionId },
    });
    if (!institucion) throw new NotFoundException('Institución no encontrada.');

    const evidencias = await this.prisma.evidencia.findMany({
      where: { institucionId },
      select: SELECCION_EVIDENCIA_PROGRESO,
      orderBy: { updatedAt: 'desc' },
    });

    const progreso = await this.construirProgreso(institucion.tipoTramiteActivo, evidencias);
    return { institucionId, ...progreso };
  }

  private async construirProgreso(
    tipoTramite: TipoTramiteSIAC,
    evidencias: EvidenciaParaProgreso[],
  ): Promise<Omit<ProgresoProcesoSIAC, 'programaId' | 'institucionId'>> {
    const tramite = tramitePorTipo(tipoTramite);
    const pesoDocumento = tramite.documentosGuia.length > 0
      ? 100 / tramite.documentosGuia.length
      : 0;

    const documentosRequeridos = await this.prisma.documentoRequerido.findMany({
      where: {
        codigoGuia: { in: tramite.documentosGuia },
        obligatorio: true,
      },
      select: { id: true, codigoGuia: true },
    });

    const documentos: DocumentoProgresoSIAC[] = tramite.documentosGuia.map((codigoGuia) => {
      const docsGuia = documentosRequeridos.filter((doc) => doc.codigoGuia === codigoGuia);
      const evidencia = evidencias.find(
        (ev) =>
          ev.codigoGuia === codigoGuia ||
          docsGuia.some((doc) => doc.id === ev.documentoRequeridoId),
      );

      const porcentajeInterno = evidencia ? porcentajeInternoEvidencia(evidencia) : 0;

      const aportacion = Math.round((pesoDocumento * porcentajeInterno) / 100);

      return {
        codigoGuia,
        nombre: ETIQUETAS_GUIA[codigoGuia],
        peso: Math.round(pesoDocumento),
        porcentajeInterno: Math.round(porcentajeInterno),
        aportacion,
        estado: evidencia?.estado ?? null,
        puntaje: evidencia?.puntajeActual ?? null,
        totalCondiciones: evidencia?.totalCondicionesActual ?? null,
        aceptado:
          evidencia?.estado === EstadoEvidencia.Cumple ||
          evidencia?.estado === EstadoEvidencia.Validado,
        conObservaciones: evidencia?.estado === EstadoEvidencia.ConObservaciones,
        rechazado: evidencia?.estado === EstadoEvidencia.Rechazado,
      };
    });

    const avanceGlobal = documentos.reduce((acc, doc) => acc + doc.aportacion, 0);
    const documentosAceptados = documentos.filter((doc) => doc.aceptado).length;

    return {
      tipoTramite,
      avanceGlobal,
      documentosAceptados,
      documentosTotal: tramite.documentosGuia.length,
      documentos,
    };
  }
}

/**
 * Aporte interno de una guía (0-100) según la regla n/9:
 * - Cumple o Validado => 100.
 * - Rechazado (decisión explícita) => 0.
 * - Con puntaje de una verificación previa (Con observaciones, o corrección reenviada) =>
 *   proporción del puntaje (5/9 => 56).
 * - Sin verificación => 0 (sin documentos revisados no se reporta avance).
 */
export function porcentajeInternoEvidencia(evidencia: {
  estado: EstadoEvidencia;
  puntajeActual: number | null;
  totalCondicionesActual: number | null;
}): number {
  if (evidencia.estado === EstadoEvidencia.Cumple || evidencia.estado === EstadoEvidencia.Validado) {
    return 100;
  }
  if (evidencia.estado === EstadoEvidencia.Rechazado) return 0;
  if (evidencia.puntajeActual !== null && evidencia.totalCondicionesActual) {
    return (evidencia.puntajeActual / evidencia.totalCondicionesActual) * 100;
  }
  return 0;
}
