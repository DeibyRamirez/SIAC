import { Injectable, Logger } from '@nestjs/common';

import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.module';

import { Evidencia, EstadoEvidencia, Prisma } from '@prisma/client';



export interface ComentarioVersionPersistido {

  hunkId?: string;

  anchor?: string;

  quote?: string;

  texto: string;

  autor?: string;

}


export interface FiltrosEvidencia {

  programaId?: string;

  periodo?: string;

  factor?: string;

  indicador?: string;

  estado?: EstadoEvidencia;

  busqueda?: string;

  autorId?: string;

  soloValidados?: boolean;

  pagina?: number;

  limite?: number;

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



  listar(filtros: FiltrosEvidencia) {

    const where: Prisma.EvidenciaWhereInput = {};



    if (filtros.programaId) where.programaId = filtros.programaId;

    if (filtros.periodo) where.periodo = filtros.periodo;

    if (filtros.factor) where.factor = filtros.factor;

    if (filtros.indicador) where.indicador = filtros.indicador;

    if (filtros.estado) where.estado = filtros.estado;

    if (filtros.autorId) where.autorId = filtros.autorId;

    if (filtros.soloValidados) where.estado = EstadoEvidencia.Validado;



    if (filtros.busqueda) {

      where.OR = [

        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },

        { factor: { contains: filtros.busqueda, mode: 'insensitive' } },

        { indicador: { contains: filtros.busqueda, mode: 'insensitive' } },

        { periodo: { contains: filtros.busqueda, mode: 'insensitive' } },

        { nombreArchivo: { contains: filtros.busqueda, mode: 'insensitive' } },

      ];

    }



    const pagina = filtros.pagina ?? 1;

    const limite = filtros.limite ?? 20;

    const skip = (pagina - 1) * limite;



    return this.prisma.$transaction([

      this.prisma.evidencia.findMany({

        where,

        include: {

          programa: { select: { id: true, nombre: true, codigo: true } },

          autor: { select: { id: true, nombre: true, correo: true } },

        },

        orderBy: { fechaCarga: 'desc' },

        skip,

        take: limite,

      }),

      this.prisma.evidencia.count({ where }),

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



  buscarPrograma(id: string) {

    return this.prisma.programa.findUnique({

      where: { id },

      select: { id: true },

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

    await this.prisma.$transaction(async (tx) => {

      await tx.$executeRawUnsafe(

        `DELETE FROM "EvidenciaComentario" WHERE "evidenciaId" = $1 AND "numeroVersion" = $2`,

        evidenciaId,

        numeroVersion,

      );

      for (const comentario of comentarios) {

        await tx.$executeRawUnsafe(

          `INSERT INTO "EvidenciaComentario" ("id","evidenciaId","numeroVersion","revisorId","autor","hunkId","anchor","quote","texto")

           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,

          randomUUID(),

          evidenciaId,

          numeroVersion,

          revisorId,

          comentario.autor ?? null,

          comentario.hunkId ?? null,

          comentario.anchor ?? null,

          comentario.quote ?? null,

          comentario.texto,

        );

      }

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

      const filas = await this.prisma.$queryRawUnsafe<

        {

          hunkId: string | null;

          anchor: string | null;

          quote: string | null;

          texto: string;

          autor: string | null;

        }[]

      >(

        `SELECT "hunkId","anchor","quote","texto","autor" FROM "EvidenciaComentario"

         WHERE "evidenciaId" = $1 AND "numeroVersion" >= $2 AND "numeroVersion" <= $3

         ORDER BY "numeroVersion" ASC, "createdAt" ASC`,

        evidenciaId,

        desde,

        hasta,

      );

      return filas.map((fila) => ({

        hunkId: fila.hunkId ?? undefined,

        anchor: fila.anchor ?? undefined,

        quote: fila.quote ?? undefined,

        texto: fila.texto,

        autor: fila.autor ?? undefined,

      }));

    } catch (err) {

      this.logger.warn(

        `No se pudieron leer comentarios de ${evidenciaId} v${desde}..v${hasta} (¿falta tabla/columna? Ejecute pnpm prisma:repair-schema): ${err instanceof Error ? err.message : err}`,

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



  async listarEnviosRevisionParaRevisor(pagina = 1, limite = 20) {

    const eventos = await this.prisma.historialEvidencia.findMany({

      where: { estado: EstadoEvidencia.EnRevision },

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

            estado: EstadoEvidencia.Rechazado,

            createdAt: { lt: evento.createdAt },

          },

        });

        const tipoEnvio = rechazoPrevio || (evento.evidencia.version ?? 1) > 1

          ? 'correccion'

          : 'inicial';

        const ultimoDictamen = await this.prisma.historialEvidencia.findFirst({

          where: {

            evidenciaId: evento.evidenciaId,

            estado: {

              in: [EstadoEvidencia.Validado, EstadoEvidencia.Rechazado],

            },

            createdAt: { lt: evento.createdAt },

          },

          orderBy: { createdAt: 'desc' },

        });

        return {

          evidenciaId: evento.evidenciaId,

          nombre: evento.evidencia.nombre,

          estado: evento.evidencia.estado,

          version: evento.evidencia.version,

          programa: evento.evidencia.programa,

          autor: evento.evidencia.autor,

          fechaEnvioRevision: evento.createdAt,

          tipoEnvio,

          observacionEnvio: evento.observacion,

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

}


