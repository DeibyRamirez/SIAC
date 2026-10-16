import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.module';

import { CodigoDocumentoGuia, Evidencia, EstadoEvidencia, Prisma } from '@prisma/client';

import { TOTAL_CONDICIONES_DOCUMENTO_MAESTRO } from '../dominio/condiciones-documento-maestro';

import { TOTAL_CONDICIONES_INSTITUCIONALES } from '../dominio/condiciones-institucionales';
import {
  CampoOrdenEvidencia,
  ColorSemaforoBusqueda,
  DireccionOrden,
  combinarConAlcance,
  construirFiltrosConsultaEvidencias,
  construirOrdenConsultaEvidencias,
} from './constructor-consulta-evidencias';
import { buscarIdsEvidenciasFts } from './fts-evidencias';
import {
  combinarCondicionTextoLibre,
  construirFiltroTextoLibre,
} from './texto-libre-evidencias';



/** Estados que cierran un ciclo de revisión (checklist n/9 o decisión explícita). */
const ESTADOS_DE_DICTAMEN: EstadoEvidencia[] = [
  EstadoEvidencia.Cumple,
  EstadoEvidencia.ConObservaciones,
  EstadoEvidencia.Validado,
  EstadoEvidencia.Rechazado,
];

/** Estados tras los que el Cargador reenvía una corrección. */
const ESTADOS_QUE_PIDEN_CORRECCION: EstadoEvidencia[] = [
  EstadoEvidencia.ConObservaciones,
  EstadoEvidencia.Rechazado,
];



export interface FiltrosEvidencia {

  programaId?: string;

  programaSlug?: string;

  periodo?: string;

  codigoGuia?: CodigoDocumentoGuia;

  estado?: EstadoEvidencia;

  busqueda?: string;

  formato?: 'pdf' | 'xlsx';

  puntajeMin?: number;

  puntajeMax?: number;

  semaforo?: ColorSemaforoBusqueda;

  fechaCargaDesde?: Date;

  fechaCargaHasta?: Date;

  fechaVerificacionDesde?: Date;

  fechaVerificacionHasta?: Date;

  autorId?: string;

  soloValidados?: boolean;

  alcance?: Prisma.EvidenciaWhereInput;

  pagina?: number;

  limite?: number;

  orden?: CampoOrdenEvidencia;

  direccion?: DireccionOrden;

  rolUsuario?: import('@prisma/client').RolUsuario;

  usarFts?: boolean;

}



export interface ComentarioVersionPersistido {

  hunkId?: string;

  anchor?: string;

  quote?: string;

  texto: string;

  autor?: string;

  numeroVersion?: number;

  createdAt?: Date;

}

@Injectable()
export class EvidenciaRepositorio {
  private readonly logger = new Logger(EvidenciaRepositorio.name);

  constructor(private readonly prisma: PrismaService) {}



  crear(datos: Prisma.EvidenciaCreateInput): Promise<Evidencia> {

    return this.prisma.evidencia.create({ data: datos });

  }



  buscarPorId(id: string) {

    return this.prisma.evidencia.findUnique({

      where: { id },

      include: {
        programa: true,
        autor: { select: { id: true, nombre: true, correo: true } },
        evaluacionesCondicion: {
          orderBy: [{ numeroRevision: 'desc' }, { codigoCondicion: 'asc' }],
        },
        evaluacionesCondicionInstitucional: {
          orderBy: [{ numeroRevision: 'desc' }, { codigoCondicion: 'asc' }],
        },
      },

    });

  }

  guardarEvaluacionesCondicion(
    evidenciaId: string,
    numeroRevision: number,
    revisorId: string,
    filas: {
      codigoCondicion: import('@prisma/client').CodigoCondicionDocumentoMaestro;
      cumple: boolean;
      observacion?: string;
    }[],
  ) {
    return this.prisma.$transaction(
      filas.map((fila) =>
        this.prisma.evaluacionCondicionEvidencia.upsert({
          where: {
            evidenciaId_numeroRevision_codigoCondicion: {
              evidenciaId,
              numeroRevision,
              codigoCondicion: fila.codigoCondicion,
            },
          },
          create: {
            evidenciaId,
            numeroRevision,
            revisorId,
            codigoCondicion: fila.codigoCondicion,
            cumple: fila.cumple,
            observacion: fila.observacion,
          },
          update: {
            revisorId,
            cumple: fila.cumple,
            observacion: fila.observacion,
          },
        }),
      ),
    );
  }

  listarEvaluacionesCondicion(evidenciaId: string, numeroRevision?: number) {
    return this.prisma.evaluacionCondicionEvidencia.findMany({
      where: {
        evidenciaId,
        ...(numeroRevision !== undefined ? { numeroRevision } : {}),
      },
      orderBy: [{ numeroRevision: 'desc' }, { codigoCondicion: 'asc' }],
    });
  }

  guardarEvaluacionesCondicionInstitucional(
    evidenciaId: string,
    numeroRevision: number,
    revisorId: string,
    filas: {
      codigoCondicion: import('@prisma/client').CodigoCondicionInstitucional;
      cumple: boolean;
      observacion?: string;
    }[],
  ) {
    return this.prisma.$transaction(
      filas.map((fila) =>
        this.prisma.evaluacionCondicionInstitucionalEvidencia.upsert({
          where: {
            evidenciaId_numeroRevision_codigoCondicion: {
              evidenciaId,
              numeroRevision,
              codigoCondicion: fila.codigoCondicion,
            },
          },
          create: {
            evidenciaId,
            numeroRevision,
            revisorId,
            codigoCondicion: fila.codigoCondicion,
            cumple: fila.cumple,
            observacion: fila.observacion,
          },
          update: {
            revisorId,
            cumple: fila.cumple,
            observacion: fila.observacion,
          },
        }),
      ),
    );
  }

  listarEvaluacionesCondicionInstitucional(
    evidenciaId: string,
    numeroRevision?: number,
  ) {
    return this.prisma.evaluacionCondicionInstitucionalEvidencia.findMany({
      where: {
        evidenciaId,
        ...(numeroRevision !== undefined ? { numeroRevision } : {}),
      },
      orderBy: [{ numeroRevision: 'desc' }, { codigoCondicion: 'asc' }],
    });
  }



  async listar(filtros: FiltrosEvidencia) {
    let condicionTextoLibre: Prisma.EvidenciaWhereInput | undefined;
    const textoBusqueda = filtros.busqueda?.trim();
    if (textoBusqueda) {
      const textoLibre = construirFiltroTextoLibre(textoBusqueda);
      if (filtros.usarFts) {
        const idsFts = await buscarIdsEvidenciasFts(this.prisma, textoBusqueda);
        condicionTextoLibre = combinarCondicionTextoLibre(idsFts, textoLibre);
      } else {
        condicionTextoLibre = textoLibre;
      }
    }

    const facetas = construirFiltrosConsultaEvidencias({
      condicionTextoLibre,
      programaId: filtros.programaId,
      programaSlug: filtros.programaSlug,
      codigoGuia: filtros.codigoGuia,
      periodo: filtros.periodo,
      estado: filtros.soloValidados ? EstadoEvidencia.Validado : filtros.estado,
      formato: filtros.formato,
      puntajeMin: filtros.puntajeMin,
      puntajeMax: filtros.puntajeMax,
      semaforo: filtros.semaforo,
      fechaCargaDesde: filtros.fechaCargaDesde,
      fechaCargaHasta: filtros.fechaCargaHasta,
      fechaVerificacionDesde: filtros.fechaVerificacionDesde,
      fechaVerificacionHasta: filtros.fechaVerificacionHasta,
      rolUsuario: filtros.rolUsuario,
    });

    const partes: Prisma.EvidenciaWhereInput[] = [facetas];
    if (filtros.autorId) partes.push({ autorId: filtros.autorId });

    const whereBase =
      partes.length === 1 ? partes[0] : { AND: partes };
    const whereFinal = combinarConAlcance(whereBase, filtros.alcance);

    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const orderBy = construirOrdenConsultaEvidencias({
      orden: filtros.orden,
      direccion: filtros.direccion,
    });

    return this.prisma.$transaction([
      this.prisma.evidencia.findMany({
        where: whereFinal,
        include: {
          programa: { select: { id: true, nombre: true, codigo: true, slug: true } },
          autor: { select: { id: true, nombre: true, correo: true } },
        },
        orderBy,
        skip,
        take: limite,
      }),
      this.prisma.evidencia.count({ where: whereFinal }),
    ]);
  }



  actualizar(id: string, datos: Prisma.EvidenciaUpdateInput): Promise<Evidencia> {

    return this.prisma.evidencia.update({ where: { id }, data: datos });

  }



  eliminar(id: string): Promise<Evidencia> {

    return this.prisma.evidencia.delete({ where: { id } });

  }



  registrarHistorial(

    evidenciaId: string,

    estado: EstadoEvidencia,

    observacion?: string,

    actorId?: string,

  ) {

    return this.prisma.historialEvidencia.create({

      data: { evidenciaId, estado, observacion, actorId },

    });

  }



  obtenerHistorial(evidenciaId: string) {

    return this.prisma.historialEvidencia.findMany({

      where: { evidenciaId },

      orderBy: { createdAt: 'asc' },

    });

  }



  registrarVersion(datos: {

    evidenciaId: string;

    numero: number;

    nombreArchivo: string;

    rutaArchivo: string;

    mimeType?: string;

    tamanoBytes?: number;

    firmaDescarga?: string;

    textoBaseAuditoria?: string;

    subidoPorId: string;

  }) {

    return this.prisma.evidenciaVersion.create({ data: datos });

  }



  actualizarVersion(

    evidenciaId: string,

    numero: number,

    datos: {

      firmaDescarga?: string;

      textoBaseAuditoria?: string;

      rutaArchivo?: string;

      nombreArchivo?: string;

      mimeType?: string;

      tamanoBytes?: number;

    },

  ) {

    return this.prisma.evidenciaVersion.update({

      where: { evidenciaId_numero: { evidenciaId, numero } },

      data: datos,

    });

  }



  eliminarVersion(evidenciaId: string, numero: number) {

    return this.prisma.evidenciaVersion.delete({

      where: { evidenciaId_numero: { evidenciaId, numero } },

    });

  }



  listarVersiones(evidenciaId: string) {

    return this.prisma.evidenciaVersion.findMany({

      where: { evidenciaId },

      include: { subidoPor: { select: { id: true, nombre: true } } },

      orderBy: { numero: 'desc' },

    });

  }



  buscarVersion(evidenciaId: string, numero: number) {

    return this.prisma.evidenciaVersion.findUnique({

      where: { evidenciaId_numero: { evidenciaId, numero } },

    });

  }



  contarPorEstado(where: Prisma.EvidenciaWhereInput) {

    return this.prisma.evidencia.groupBy({

      by: ['estado'],

      where,

      _count: { _all: true },

    });

  }



  tieneHistorialDistintoDeBorrador(evidenciaId: string) {

    return this.prisma.historialEvidencia.findFirst({

      where: {

        evidenciaId,

        estado: { not: EstadoEvidencia.Borrador },

      },

      select: { id: true },

    });

  }



  buscarPrograma(id: string) {

    return this.prisma.programa.findUnique({

      where: { id },

      select: { id: true, tipoTramiteActivo: true },

    });

  }



  buscarDocumentoRequerido(id: string) {

    return this.prisma.documentoRequerido.findUnique({

      where: { id },

      select: { id: true },

    });

  }



  async guardarComentariosVersion(

    evidenciaId: string,

    numeroVersion: number,

    revisorId: string | null,

    comentarios: ComentarioVersionPersistido[],

  ): Promise<void> {

    const recortar = (valor: string | undefined, max: number): string | null =>
      valor ? valor.slice(0, max) : null;

    await this.prisma.$transaction(async (tx) => {

      await tx.evidenciaComentario.deleteMany({

        where: { evidenciaId, numeroVersion },

      });

      if (comentarios.length === 0) return;

      // createMany conserva el orden del arreglo; el contrato de lectura ordena por
      // numeroVersion y createdAt, igual que antes.
      await tx.evidenciaComentario.createMany({

        data: comentarios.map((comentario) => ({

          id: randomUUID(),

          evidenciaId,

          numeroVersion,

          revisorId,

          autor: recortar(comentario.autor, 255),

          hunkId: recortar(comentario.hunkId, 100),

          anchor: recortar(comentario.anchor, 100),

          quote: comentario.quote ?? null,

          texto: comentario.texto,

        })),

      });

    });

  }



  async listarComentariosVersion(

    evidenciaId: string,

    numeroVersion: number,

  ): Promise<ComentarioVersionPersistido[]> {

    return this.listarComentariosRango(evidenciaId, numeroVersion, numeroVersion);

  }



  /** Comentarios de TODAS las versiones <= numeroVersion (acumulativos). */

  async listarComentariosHastaVersion(

    evidenciaId: string,

    numeroVersion: number,

  ): Promise<ComentarioVersionPersistido[]> {

    return this.listarComentariosRango(evidenciaId, 1, numeroVersion);

  }



  private async listarComentariosRango(

    evidenciaId: string,

    desde: number,

    hasta: number,

  ): Promise<ComentarioVersionPersistido[]> {

    try {

      const filas = await this.prisma.evidenciaComentario.findMany({

        where: {

          evidenciaId,

          numeroVersion: { gte: desde, lte: hasta },

        },

        orderBy: [{ numeroVersion: 'asc' }, { createdAt: 'asc' }],

        select: {

          hunkId: true,

          anchor: true,

          quote: true,

          texto: true,

          autor: true,

          numeroVersion: true,

          createdAt: true,

        },

      });

      return filas.map((fila) => ({

        hunkId: fila.hunkId ?? undefined,

        anchor: fila.anchor ?? undefined,

        quote: fila.quote ?? undefined,

        texto: fila.texto,

        autor: fila.autor ?? undefined,

        numeroVersion: fila.numeroVersion,

        createdAt: fila.createdAt,

      }));

    } catch (err) {

      this.logger.warn(

        `No se pudieron leer comentarios de ${evidenciaId} v${desde}..v${hasta} (¿falta la migración 20261006010000_evidencia_comentario_idempotente?): ${err instanceof Error ? err.message : err}`,

      );

      return [];

    }

  }



  buscarUsuarioNombre(id: string) {

    return this.prisma.usuario.findUnique({

      where: { id },

      select: { nombre: true },

    });

  }

  async listarEnviosRevisionParaRevisor(

    pagina = 1,

    limite = 20,

    programaIds?: string[],

    incluirInstitucional = false,

  ) {

    let filtroEvidencia: Prisma.EvidenciaWhereInput | undefined;
    if (programaIds !== undefined) {
      const condiciones: Prisma.EvidenciaWhereInput[] = [];
      if (programaIds.length > 0) {
        condiciones.push({ programaId: { in: programaIds } });
      }
      if (incluirInstitucional) {
        condiciones.push({ institucionId: { not: null } });
      }
      filtroEvidencia =
        condiciones.length > 0 ? { OR: condiciones } : { id: { in: [] } };
    }

    const eventos = await this.prisma.historialEvidencia.findMany({

      where: {

        estado: EstadoEvidencia.EnRevision,

        ...(filtroEvidencia ? { evidencia: filtroEvidencia } : {}),

      },

      orderBy: { createdAt: 'desc' },

      include: {

        evidencia: {

          include: {

            programa: { select: { id: true, nombre: true } },

            autor: { select: { id: true, nombre: true } },

          },

        },

      },

    });



    const filas = await Promise.all(

      eventos.map(async (evento) => {

        const rechazoPrevio = await this.prisma.historialEvidencia.findFirst({

          where: {

            evidenciaId: evento.evidenciaId,

            estado: { in: ESTADOS_QUE_PIDEN_CORRECCION },

            createdAt: { lt: evento.createdAt },

          },

        });

        const tipoEnvio = rechazoPrevio || (evento.evidencia.version ?? 1) > 1

          ? 'correccion'

          : 'inicial';

        const ultimoDictamen = await this.prisma.historialEvidencia.findFirst({

          where: {

            evidenciaId: evento.evidenciaId,

            estado: { in: ESTADOS_DE_DICTAMEN },

            createdAt: { lt: evento.createdAt },

          },

          orderBy: { createdAt: 'desc' },

        });

        const siguienteEnvio = await this.prisma.historialEvidencia.findFirst({

          where: {

            evidenciaId: evento.evidenciaId,

            estado: EstadoEvidencia.EnRevision,

            createdAt: { gt: evento.createdAt },

          },

          orderBy: { createdAt: 'asc' },

        });

        const dictamenCiclo = await this.prisma.historialEvidencia.findFirst({

          where: {

            evidenciaId: evento.evidenciaId,

            estado: { in: ESTADOS_DE_DICTAMEN },

            createdAt: siguienteEnvio

              ? { gt: evento.createdAt, lt: siguienteEnvio.createdAt }

              : { gt: evento.createdAt },

          },

          orderBy: { createdAt: 'asc' },

        });

        const versionEnEnvio = await this.prisma.evidenciaVersion.findFirst({

          where: {

            evidenciaId: evento.evidenciaId,

            createdAt: { lte: evento.createdAt },

          },

          orderBy: { numero: 'desc' },

          select: { numero: true },

        });

        const numeroRevision = versionEnEnvio?.numero ?? evento.evidencia.version ?? 1;

        const { puntaje, totalCondiciones } = await this.puntajeDeRevision(

          evento.evidenciaId,

          numeroRevision,

          dictamenCiclo?.estado ?? null,

          evento.evidencia,

        );



        return {

          evidenciaId: evento.evidenciaId,

          nombre: evento.evidencia.nombre,

          estado: dictamenCiclo?.estado ?? evento.evidencia.estado,

          version: numeroRevision,

          numeroRevision,

          programa: evento.evidencia.programa,

          autor: evento.evidencia.autor,

          fechaEnvioRevision: evento.createdAt,

          tipoEnvio,

          observacionEnvio: evento.observacion,

          observacionesDictamen: dictamenCiclo?.observacion ?? null,

          puntaje,

          totalCondiciones,

          ultimoDictamenEstado: ultimoDictamen?.estado ?? null,

          ultimoDictamenFecha: ultimoDictamen?.createdAt ?? null,

        };

      }),

    );



    const total = filas.length;

    const inicio = (pagina - 1) * limite;

    return {

      datos: filas.slice(inicio, inicio + limite),

      total,

      pagina,

      limite,

    };

  }


  /**
   * Puntaje n/total de un ciclo de revisión, leído de las evaluaciones binarias guardadas
   * (G1: 9 condiciones; G3: 6). Si el ciclo aún no tiene dictamen devuelve null.
   */
  private async puntajeDeRevision(
    evidenciaId: string,
    numeroRevision: number,
    estadoDictamen: EstadoEvidencia | null,
    evidencia: { puntajeActual: number | null; totalCondicionesActual: number | null },
  ): Promise<{ puntaje: number | null; totalCondiciones: number | null }> {
    if (!estadoDictamen) return { puntaje: null, totalCondiciones: null };

    const [programa, institucional] = await Promise.all([
      this.prisma.evaluacionCondicionEvidencia.findMany({
        where: { evidenciaId, numeroRevision },
        select: { cumple: true },
      }),
      this.prisma.evaluacionCondicionInstitucionalEvidencia.findMany({
        where: { evidenciaId, numeroRevision },
        select: { cumple: true },
      }),
    ]);

    if (programa.length > 0) {
      return {
        puntaje: programa.filter((e) => e.cumple).length,
        totalCondiciones: TOTAL_CONDICIONES_DOCUMENTO_MAESTRO,
      };
    }
    if (institucional.length > 0) {
      return {
        puntaje: institucional.filter((e) => e.cumple).length,
        totalCondiciones: TOTAL_CONDICIONES_INSTITUCIONALES,
      };
    }
    return {
      puntaje: evidencia.puntajeActual,
      totalCondiciones: evidencia.totalCondicionesActual,
    };
  }
}


