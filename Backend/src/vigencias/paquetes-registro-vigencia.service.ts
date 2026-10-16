import { Injectable } from '@nestjs/common';
import {
  CodigoDocumentoGuia,
  EstadoEvidencia,
  TipoTramiteSIAC,
} from '@prisma/client';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import {
  calcularFechaFinVigencia,
  calcularSemaforoVigencia,
  ColorSemaforoVigencia,
  esEstadoRevisado,
} from '../dominio/panel-siac';
import { PrismaService } from '../prisma/prisma.module';
import { ETIQUETAS_GUIA, tramitePorTipo } from '../programas/catalogo-tramites-siac';

const MS_POR_ANIO = 365.25 * 24 * 60 * 60 * 1000;

export type AlcancePaqueteVigencia = 'Programa' | 'Institucion';

export interface DocumentoPaqueteVigencia {
  tipo: 'Guia' | 'ResolucionMen';
  codigoGuia?: CodigoDocumentoGuia;
  evidenciaId: string;
  nombre: string;
  nombreArchivo: string | null;
  estado: EstadoEvidencia;
}

export interface PaqueteVigenciaRegistro {
  alcance: AlcancePaqueteVigencia;
  entidadId: string;
  nombre: string;
  codigo: string;
  tipoTramite: TipoTramiteSIAC;
  fechaResolucion: string;
  fechaFinVigencia: string;
  semaforoVigencia: ColorSemaforoVigencia;
  porcentajeVigencia: number;
  documentos: DocumentoPaqueteVigencia[];
}

@Injectable()
export class PaquetesRegistroVigenciaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracion: ConfiguracionSiacService,
  ) {}

  async listar(programaId?: string): Promise<PaqueteVigenciaRegistro[]> {
    const referencia = new Date();
    const umbrales = this.configuracion.obtener();
    const paquetes: PaqueteVigenciaRegistro[] = [];

    const programas = await this.prisma.programa.findMany({
      where: {
        fechaResolucion: { not: null },
        ...(programaId ? { id: programaId } : {}),
      },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        fechaResolucion: true,
        inicioCicloTramiteAt: true,
      },
      orderBy: { nombre: 'asc' },
    });

    for (const programa of programas) {
      if (!programa.fechaResolucion) continue;
      const resolucion = await this.prisma.resolucionMen.findFirst({
        where: { programaId: programa.id },
        orderBy: { createdAt: 'desc' },
        include: {
          evidencia: {
            select: {
              id: true,
              nombre: true,
              nombreArchivo: true,
              estado: true,
            },
          },
        },
      });
      if (!resolucion) continue;

      const documentos = await this.documentosGuiaAceptadas({
        programaId: programa.id,
        codigosGuia: tramitePorTipo(resolucion.tipoTramite).documentosGuia.map((d) => d.codigo),
        desde: programa.inicioCicloTramiteAt,
      });

      if (resolucion.evidencia) {
        documentos.push({
          tipo: 'ResolucionMen',
          evidenciaId: resolucion.evidencia.id,
          nombre: resolucion.evidencia.nombre,
          nombreArchivo: resolucion.evidencia.nombreArchivo,
          estado: resolucion.evidencia.estado,
        });
      }

      paquetes.push(
        this.armarPaquete({
          alcance: 'Programa',
          entidadId: programa.id,
          nombre: programa.nombre,
          codigo: programa.codigo,
          tipoTramite: resolucion.tipoTramite,
          fechaResolucion: programa.fechaResolucion,
          referencia,
          umbrales,
          documentos,
        }),
      );
    }

    if (!programaId) {
      const institucion = await this.prisma.institucion.findFirst({
        where: { fechaResolucion: { not: null } },
      });
      if (institucion?.fechaResolucion) {
        const resolucion = await this.prisma.resolucionMen.findFirst({
          where: { institucionId: institucion.id },
          orderBy: { createdAt: 'desc' },
          include: {
            evidencia: {
              select: {
                id: true,
                nombre: true,
                nombreArchivo: true,
                estado: true,
              },
            },
          },
        });
        if (resolucion) {
          const documentos = await this.documentosGuiaAceptadas({
            institucionId: institucion.id,
            codigosGuia: tramitePorTipo(resolucion.tipoTramite).documentosGuia.map((d) => d.codigo),
          });
          if (resolucion.evidencia) {
            documentos.push({
              tipo: 'ResolucionMen',
              evidenciaId: resolucion.evidencia.id,
              nombre: resolucion.evidencia.nombre,
              nombreArchivo: resolucion.evidencia.nombreArchivo,
              estado: resolucion.evidencia.estado,
            });
          }
          paquetes.push(
            this.armarPaquete({
              alcance: 'Institucion',
              entidadId: institucion.id,
              nombre: institucion.nombre,
              codigo: institucion.codigo,
              tipoTramite: resolucion.tipoTramite,
              fechaResolucion: institucion.fechaResolucion,
              referencia,
              umbrales,
              documentos,
            }),
          );
        }
      }
    }

    return paquetes;
  }

  private armarPaquete(input: {
    alcance: AlcancePaqueteVigencia;
    entidadId: string;
    nombre: string;
    codigo: string;
    tipoTramite: TipoTramiteSIAC;
    fechaResolucion: Date;
    referencia: Date;
    umbrales: ReturnType<ConfiguracionSiacService['obtener']>;
    documentos: DocumentoPaqueteVigencia[];
  }): PaqueteVigenciaRegistro {
    const semaforoVigencia = calcularSemaforoVigencia(
      input.fechaResolucion,
      input.referencia,
      input.umbrales,
    );
    const fin = calcularFechaFinVigencia(input.fechaResolucion, input.umbrales.aniosVigencia);
    return {
      alcance: input.alcance,
      entidadId: input.entidadId,
      nombre: input.nombre,
      codigo: input.codigo,
      tipoTramite: input.tipoTramite,
      fechaResolucion: input.fechaResolucion.toISOString(),
      fechaFinVigencia: fin.toISOString(),
      semaforoVigencia,
      porcentajeVigencia: calcularPorcentajeVigencia(
        input.fechaResolucion,
        input.referencia,
        input.umbrales.aniosVigencia,
      ),
      documentos: input.documentos,
    };
  }

  private async documentosGuiaAceptadas(filtro: {
    programaId?: string;
    institucionId?: string;
    codigosGuia: CodigoDocumentoGuia[];
    desde?: Date;
  }): Promise<DocumentoPaqueteVigencia[]> {
    const evidencias = await this.prisma.evidencia.findMany({
      where: {
        ...(filtro.programaId ? { programaId: filtro.programaId } : {}),
        ...(filtro.institucionId ? { institucionId: filtro.institucionId } : {}),
        codigoGuia: { in: filtro.codigosGuia },
        ...(filtro.desde ? { createdAt: { gte: filtro.desde } } : {}),
        estado: {
          in: [EstadoEvidencia.Cumple, EstadoEvidencia.Validado],
        },
      },
      select: {
        id: true,
        codigoGuia: true,
        nombre: true,
        nombreArchivo: true,
        estado: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ultimaAceptada = new Map<CodigoDocumentoGuia, (typeof evidencias)[0]>();
    for (const ev of evidencias) {
      if (!ev.codigoGuia || !esEstadoRevisado(ev.estado)) continue;
      if (ev.estado !== EstadoEvidencia.Cumple && ev.estado !== EstadoEvidencia.Validado) continue;
      if (!ultimaAceptada.has(ev.codigoGuia)) {
        ultimaAceptada.set(ev.codigoGuia, ev);
      }
    }

    const documentos: DocumentoPaqueteVigencia[] = [];
    for (const codigo of filtro.codigosGuia) {
      const ev = ultimaAceptada.get(codigo);
      if (!ev) continue;
      documentos.push({
        tipo: 'Guia',
        codigoGuia: codigo,
        evidenciaId: ev.id,
        nombre: ev.nombre || ETIQUETAS_GUIA[codigo],
        nombreArchivo: ev.nombreArchivo,
        estado: ev.estado,
      });
    }
    return documentos;
  }
}

export function calcularPorcentajeVigencia(
  fechaResolucion: Date,
  referencia: Date,
  aniosVigencia: number,
): number {
  const ms = referencia.getTime() - fechaResolucion.getTime();
  const anios = Math.max(0, ms / MS_POR_ANIO);
  return Math.min(100, Math.round((anios / aniosVigencia) * 100));
}

export function calcularReferenciaDemoVigencia(
  fechaResolucion: Date,
  inicioDemoMs: number,
  ahoraMs: number,
  duracionPruebaSeg: number,
  aniosVigencia: number,
): Date {
  const fin = calcularFechaFinVigencia(fechaResolucion, aniosVigencia);
  const duracionVigenciaMs = fin.getTime() - fechaResolucion.getTime();
  const transcurridoSeg = Math.max(0, (ahoraMs - inicioDemoMs) / 1000);
  const fraccion = Math.min(1, transcurridoSeg / duracionPruebaSeg);
  return new Date(fechaResolucion.getTime() + duracionVigenciaMs * fraccion);
}
