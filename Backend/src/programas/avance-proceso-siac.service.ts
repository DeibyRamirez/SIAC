import { Injectable, NotFoundException } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { ETIQUETAS_GUIA, tramitePorTipo } from './catalogo-tramites-siac';

export interface DocumentoProgresoSIAC {
  codigoGuia: CodigoDocumentoGuia;
  nombre: string;
  peso: number;
  porcentajeInterno: number;
  aportacion: number;
  aceptado: boolean;
  rechazado: boolean;
}

export interface ProgresoProcesoSIAC {
  programaId: string;
  tipoTramite: TipoTramiteSIAC;
  avanceGlobal: number;
  documentosAceptados: number;
  documentosTotal: number;
  documentos: DocumentoProgresoSIAC[];
}

@Injectable()
export class AvanceProcesoSIACService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularProgresoPrograma(programaId: string): Promise<ProgresoProcesoSIAC> {
    const programa = await this.prisma.programa.findUnique({ where: { id: programaId } });
    if (!programa) throw new NotFoundException('Programa no encontrado.');

    const tramite = tramitePorTipo(programa.tipoTramiteActivo);
    const pesoDocumento = tramite.documentosGuia.length > 0
      ? 100 / tramite.documentosGuia.length
      : 0;

    const documentosRequeridos = await this.prisma.documentoRequerido.findMany({
      where: {
        codigoGuia: { in: tramite.documentosGuia },
        obligatorio: true,
      },
    });

    const evidencias = await this.prisma.evidencia.findMany({
      where: { programaId },
      select: {
        documentoRequeridoId: true,
        codigoGuia: true,
        estado: true,
        porcentajeCompletitud: true,
        updatedAt: true,
        documentoRequerido: { select: { codigoGuia: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const documentos: DocumentoProgresoSIAC[] = tramite.documentosGuia.map((codigoGuia) => {
      const docsGuia = documentosRequeridos.filter((doc) => doc.codigoGuia === codigoGuia);
      const evidencia = evidencias.find(
        (ev) =>
          ev.codigoGuia === codigoGuia ||
          docsGuia.some((doc) => doc.id === ev.documentoRequeridoId),
      );

      const porcentajeInterno = !evidencia
        ? 0
        : evidencia.estado === EstadoEvidencia.Validado
          ? 100
          : evidencia.porcentajeCompletitud;

      const aportacion = Math.round((pesoDocumento * porcentajeInterno) / 100);

      return {
        codigoGuia,
        nombre: ETIQUETAS_GUIA[codigoGuia],
        peso: Math.round(pesoDocumento),
        porcentajeInterno: Math.round(porcentajeInterno),
        aportacion,
        aceptado: evidencia?.estado === EstadoEvidencia.Validado,
        rechazado: evidencia?.estado === EstadoEvidencia.Rechazado,
      };
    });

    const avanceGlobal = documentos.reduce((acc, doc) => acc + doc.aportacion, 0);
    const documentosAceptados = documentos.filter((doc) => doc.aceptado).length;

    return {
      programaId,
      tipoTramite: programa.tipoTramiteActivo,
      avanceGlobal,
      documentosAceptados,
      documentosTotal: tramite.documentosGuia.length,
      documentos,
    };
  }
}
