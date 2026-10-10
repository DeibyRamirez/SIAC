import { Injectable, NotFoundException } from '@nestjs/common';
import { CodigoDocumentoGuia, EstadoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { calcularAvancePonderado, esEstadoRevisado, redondear2 } from '../dominio/panel-siac';
import { esGuiaSinPuntaje } from '../dominio/guias-documento';
import { ETIQUETAS_GUIA, tramitePorTipo } from './catalogo-tramites-siac';

export interface DocumentoProgresoSIAC {
  codigoGuia: CodigoDocumentoGuia;
  nombre: string;
  peso: number;
  porcentajeInterno: number;
  aportacion: number;
  /** Estado de la evidencia más reciente revisada de la guía (null si no hay). */
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
  programaId: string;
  tipoTramite: TipoTramiteSIAC;
  avanceGlobal: number;
  documentosAceptados: number;
  documentosTotal: number;
  documentos: DocumentoProgresoSIAC[];
  /** Guías del trámite que aún no están aprobadas (Cumple/Validado). */
  documentosPendientes: CodigoDocumentoGuia[];
  /** Se habilita «Cargar resolución» solo cuando todos los documentos del trámite están aprobados. */
  puedeCargarResolucion: boolean;
}

@Injectable()
export class AvanceProcesoSIACService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularProgresoPrograma(programaId: string): Promise<ProgresoProcesoSIAC> {
    const programa = await this.prisma.programa.findUnique({ where: { id: programaId } });
    if (!programa) throw new NotFoundException('Programa no encontrado.');

    const tramite = tramitePorTipo(programa.tipoTramiteActivo);
    const codigosGuia = tramite.documentosGuia.map((d) => d.codigo);

    const pesosDb = await this.prisma.tramiteDocumentoGuia.findMany({
      where: {
        tramite: { tipo: programa.tipoTramiteActivo },
        codigoGuia: { in: codigosGuia },
      },
      select: { codigoGuia: true, pesoPorcentaje: true },
    });
    const mapaPesos = new Map(pesosDb.map((p) => [p.codigoGuia, p.pesoPorcentaje]));

    const evidencias = await this.prisma.evidencia.findMany({
      where: {
        programaId,
        codigoGuia: { in: codigosGuia },
        createdAt: { gte: programa.inicioCicloTramiteAt },
        estado: {
          in: [
            EstadoEvidencia.Cumple,
            EstadoEvidencia.ConObservaciones,
            EstadoEvidencia.Validado,
            EstadoEvidencia.Rechazado,
          ],
        },
      },
      select: {
        codigoGuia: true,
        estado: true,
        puntajeActual: true,
        totalCondicionesActual: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ultimaPorGuia = new Map<CodigoDocumentoGuia, (typeof evidencias)[0]>();
    for (const ev of evidencias) {
      if (!ev.codigoGuia || !esEstadoRevisado(ev.estado)) continue;
      if (!ultimaPorGuia.has(ev.codigoGuia)) {
        ultimaPorGuia.set(ev.codigoGuia, ev);
      }
    }

    const documentos: (DocumentoProgresoSIAC & { porcentajeBruto: number })[] = tramite.documentosGuia.map((docGuia) => {
      const codigoGuia = docGuia.codigo;
      const peso = mapaPesos.get(codigoGuia) ?? docGuia.pesoPorcentaje;
      const evidencia = ultimaPorGuia.get(codigoGuia);
      // R-010.1a: sin redondeos intermedios; solo se redondea lo que se muestra.
      const porcentajeBruto = evidencia ? porcentajeInternoEvidencia(evidencia) : 0;
      const porcentajeInterno = redondear2(porcentajeBruto);
      const aportacion = redondear2((peso * porcentajeBruto) / 100);

      return {
        codigoGuia,
        nombre: ETIQUETAS_GUIA[codigoGuia],
        peso,
        porcentajeInterno,
        aportacion,
        estado: evidencia?.estado ?? null,
        puntaje: evidencia?.puntajeActual ?? null,
        totalCondiciones: evidencia?.totalCondicionesActual ?? null,
        aceptado:
          evidencia?.estado === EstadoEvidencia.Cumple ||
          evidencia?.estado === EstadoEvidencia.Validado,
        conObservaciones: evidencia?.estado === EstadoEvidencia.ConObservaciones,
        rechazado: evidencia?.estado === EstadoEvidencia.Rechazado,
        porcentajeBruto,
      };
    });

    const avanceGlobal = calcularAvancePonderado(
      documentos.map((doc) => ({ codigoGuia: doc.codigoGuia, porcentajeInterno: doc.porcentajeBruto, peso: doc.peso })),
    );
    const documentosAceptados = documentos.filter((doc) => doc.aceptado).length;

    return {
      programaId,
      tipoTramite: programa.tipoTramiteActivo,
      avanceGlobal,
      documentosAceptados,
      documentosTotal: tramite.documentosGuia.length,
      documentos: documentos.map(({ porcentajeBruto: _bruto, ...doc }) => doc),
      ...estadoResolucion(documentos),
    };
  }

  async calcularProgresoInstitucion(institucionId: string): Promise<ProgresoProcesoSIAC> {
    const institucion = await this.prisma.institucion.findUnique({ where: { id: institucionId } });
    if (!institucion) throw new NotFoundException('Institución no encontrada.');

    const tramite = tramitePorTipo(institucion.tipoTramiteActivo);
    const codigosGuia = tramite.documentosGuia.map((d) => d.codigo);

    const pesosDb = await this.prisma.tramiteDocumentoGuia.findMany({
      where: {
        tramite: { tipo: institucion.tipoTramiteActivo },
        codigoGuia: { in: codigosGuia },
      },
      select: { codigoGuia: true, pesoPorcentaje: true },
    });
    const mapaPesos = new Map(pesosDb.map((p) => [p.codigoGuia, p.pesoPorcentaje]));

    const evidencias = await this.prisma.evidencia.findMany({
      where: {
        institucionId,
        codigoGuia: { in: codigosGuia },
        estado: {
          in: [
            EstadoEvidencia.Cumple,
            EstadoEvidencia.ConObservaciones,
            EstadoEvidencia.Validado,
            EstadoEvidencia.Rechazado,
          ],
        },
      },
      select: {
        codigoGuia: true,
        estado: true,
        puntajeActual: true,
        totalCondicionesActual: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ultimaPorGuia = new Map<CodigoDocumentoGuia, (typeof evidencias)[0]>();
    for (const ev of evidencias) {
      if (!ev.codigoGuia || !esEstadoRevisado(ev.estado)) continue;
      if (!ultimaPorGuia.has(ev.codigoGuia)) {
        ultimaPorGuia.set(ev.codigoGuia, ev);
      }
    }

    const documentos: (DocumentoProgresoSIAC & { porcentajeBruto: number })[] = tramite.documentosGuia.map((docGuia) => {
      const codigoGuia = docGuia.codigo;
      const peso = mapaPesos.get(codigoGuia) ?? docGuia.pesoPorcentaje;
      const evidencia = ultimaPorGuia.get(codigoGuia);
      // R-010.1a: sin redondeos intermedios; solo se redondea lo que se muestra.
      const porcentajeBruto = evidencia ? porcentajeInternoEvidencia(evidencia) : 0;
      const porcentajeInterno = redondear2(porcentajeBruto);
      const aportacion = redondear2((peso * porcentajeBruto) / 100);

      return {
        codigoGuia,
        nombre: ETIQUETAS_GUIA[codigoGuia],
        peso,
        porcentajeInterno,
        aportacion,
        estado: evidencia?.estado ?? null,
        puntaje: evidencia?.puntajeActual ?? null,
        totalCondiciones: evidencia?.totalCondicionesActual ?? null,
        aceptado:
          evidencia?.estado === EstadoEvidencia.Cumple ||
          evidencia?.estado === EstadoEvidencia.Validado,
        conObservaciones: evidencia?.estado === EstadoEvidencia.ConObservaciones,
        rechazado: evidencia?.estado === EstadoEvidencia.Rechazado,
        porcentajeBruto,
      };
    });

    const avanceGlobal = calcularAvancePonderado(
      documentos.map((doc) => ({ codigoGuia: doc.codigoGuia, porcentajeInterno: doc.porcentajeBruto, peso: doc.peso })),
    );
    const documentosAceptados = documentos.filter((doc) => doc.aceptado).length;

    return {
      programaId: institucionId,
      tipoTramite: institucion.tipoTramiteActivo,
      avanceGlobal,
      documentosAceptados,
      documentosTotal: tramite.documentosGuia.length,
      documentos: documentos.map(({ porcentajeBruto: _bruto, ...doc }) => doc),
      ...estadoResolucion(documentos),
    };
  }
}

/**
 * Aporte interno de una guía (0-100):
 * - Cumple o Validado => 100.
 * - G2/G4 (sin puntaje): 0 hasta que se aprueban; «Con observaciones» aporta 0 (ya no hay «G2 al 70 %»).
 * - G1/G3 con puntaje de verificación => proporción n/total.
 * - Sin verificación revisada => 0.
 */
export function porcentajeInternoEvidencia(evidencia: {
  codigoGuia?: CodigoDocumentoGuia | null;
  estado: EstadoEvidencia;
  puntajeActual: number | null;
  totalCondicionesActual: number | null;
}): number {
  if (evidencia.estado === EstadoEvidencia.Cumple || evidencia.estado === EstadoEvidencia.Validado) {
    return 100;
  }
  if (evidencia.estado === EstadoEvidencia.Rechazado) return 0;
  if (esGuiaSinPuntaje(evidencia.codigoGuia)) return 0;
  if (evidencia.puntajeActual !== null && evidencia.totalCondicionesActual) {
    return (evidencia.puntajeActual / evidencia.totalCondicionesActual) * 100;
  }
  return 0;
}

/** Documentos pendientes y habilitación de la carga de la resolución MEN. */
function estadoResolucion(documentos: { codigoGuia: CodigoDocumentoGuia; aceptado: boolean }[]) {
  const documentosPendientes = documentos.filter((doc) => !doc.aceptado).map((doc) => doc.codigoGuia);
  return {
    documentosPendientes,
    puedeCargarResolucion: documentos.length > 0 && documentosPendientes.length === 0,
  };
}
