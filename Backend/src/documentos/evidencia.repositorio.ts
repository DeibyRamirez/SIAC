import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.module';

import { Evidencia, EstadoEvidencia, Prisma } from '@prisma/client';



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


