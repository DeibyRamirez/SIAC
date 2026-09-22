import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { ConfigService } from '@nestjs/config';

import * as nodemailer from 'nodemailer';

import { PrismaService } from '../prisma/prisma.module';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { EstadoVigencia } from '@prisma/client';



const TIPOS_DOCUMENTO = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];



@Injectable()

export class VigenciasService {

  private readonly logger = new Logger(VigenciasService.name);

  private transporter: nodemailer.Transporter | null = null;



  constructor(

    private readonly prisma: PrismaService,

    private readonly notificaciones: NotificacionesService,

    private readonly config: ConfigService,

    private readonly almacenamiento: AlmacenamientoService,

  ) {

    const host = config.get('SMTP_HOST');

    if (host) {

      this.transporter = nodemailer.createTransport({

        host,

        port: parseInt(config.get('SMTP_PORT') ?? '587', 10),

        auth: {

          user: config.get('SMTP_USUARIO'),

          pass: config.get('SMTP_CONTRASENA'),

        },

      });

    }

  }



  listarAnexos(programaId?: string) {

    return this.prisma.anexoVigencia.findMany({

      where: programaId ? { programaId } : undefined,

      include: { programa: { select: { id: true, nombre: true, codigo: true } } },

      orderBy: { fechaVencimiento: 'asc' },

    }).then((anexos) => anexos.map((a) => this.enriquecerAnexo(a)));

  }



  private enriquecerAnexo(anexo: {

    id: string;

    titulo: string;

    fechaCarga: Date;

    fechaVencimiento: Date;

    estado: EstadoVigencia;

    aniosVigencia: number;

    [key: string]: unknown;

  }) {

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const inicio = new Date(anexo.fechaCarga);

    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(anexo.fechaVencimiento);

    fin.setHours(0, 0, 0, 0);



    const totalDias = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));

    const transcurridos = Math.max(0, Math.ceil((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));

    const porcentajeTranscurrido = Math.min(100, Math.round((transcurridos / totalDias) * 100));



    return { ...anexo, porcentajeTranscurrido, totalDias, diasTranscurridos: transcurridos };

  }



  calcularFechaVencimiento(fechaCarga: Date, aniosVigencia: number): Date {

    const vencimiento = new Date(fechaCarga);

    vencimiento.setFullYear(vencimiento.getFullYear() + aniosVigencia);

    return vencimiento;

  }



  async crearAnexoConArchivo(

    datos: {

      titulo: string;

      programaId: string;

      tipo: string;

      carpeta: string;

      aniosVigencia: number;

      responsable: string;

    },

    archivo: Express.Multer.File,

  ) {

    if (!archivo) throw new NotFoundException('Se requiere un archivo.');

    if (!TIPOS_DOCUMENTO.includes(archivo.mimetype)) {

      throw new NotFoundException('Formato de archivo no permitido.');

    }



    const fechaCarga = new Date();

    const fechaVencimiento = this.calcularFechaVencimiento(fechaCarga, datos.aniosVigencia);

    const estado = this.calcularEstado(fechaVencimiento);

    const clave = this.almacenamiento.generarClaveDocumento(datos.carpeta, archivo.originalname);



    const anexo = await this.prisma.anexoVigencia.create({

      data: {

        ...datos,

        fechaCarga,

        fechaVencimiento,

        estado,

        nombreArchivo: archivo.originalname,

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

      },

      include: { programa: { select: { id: true, nombre: true, codigo: true } } },

    });



    try {

      await this.almacenamiento.subirArchivo(archivo.buffer, clave, 'documentos', archivo.mimetype);

    } catch (err) {

      await this.prisma.anexoVigencia.delete({ where: { id: anexo.id } }).catch(() => undefined);

      throw err;

    }



    return this.enriquecerAnexo(anexo);

  }



  crearAnexo(datos: {

    titulo: string;

    programaId: string;

    tipo: string;

    fechaVencimiento: Date;

    responsable: string;

    carpeta?: string;

    aniosVigencia?: number;

  }) {

    const fechaCarga = new Date();

    const estado = this.calcularEstado(datos.fechaVencimiento);

    return this.prisma.anexoVigencia.create({

      data: {

        titulo: datos.titulo,

        programaId: datos.programaId,

        tipo: datos.tipo,

        responsable: datos.responsable,

        carpeta: datos.carpeta ?? 'general',

        aniosVigencia: datos.aniosVigencia ?? 7,

        fechaCarga,

        fechaVencimiento: datos.fechaVencimiento,

        estado,

      },

    }).then((a) => this.enriquecerAnexo(a));

  }



  actualizarAnexo(id: string, datos: Partial<{ titulo: string; fechaVencimiento: Date; responsable: string }>) {

    const updateData: Record<string, unknown> = { ...datos };

    if (datos.fechaVencimiento) {

      updateData.estado = this.calcularEstado(datos.fechaVencimiento);

    }

    return this.prisma.anexoVigencia.update({ where: { id }, data: updateData }).then((a) => this.enriquecerAnexo(a));

  }



  async eliminarAnexo(id: string) {

    const anexo = await this.prisma.anexoVigencia.findUnique({ where: { id } });

    if (!anexo) throw new NotFoundException('Anexo no encontrado.');

    if (anexo.rutaArchivo) {

      await this.almacenamiento.eliminarArchivo(anexo.rutaArchivo, 'documentos').catch(() => undefined);

    }

    return this.prisma.anexoVigencia.delete({ where: { id } });

  }



  async obtenerUrlDescarga(id: string) {

    const anexo = await this.prisma.anexoVigencia.findUnique({ where: { id } });

    if (!anexo?.rutaArchivo) throw new NotFoundException('Archivo no disponible.');

    return this.almacenamiento.generarUrlFirmada(anexo.rutaArchivo, 'documentos');

  }



  calcularEstado(fechaVencimiento: Date): EstadoVigencia {

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const vencimiento = new Date(fechaVencimiento);

    vencimiento.setHours(0, 0, 0, 0);



    const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));



    if (diffDias < 0) return EstadoVigencia.Vencido;

    if (diffDias <= 30) return EstadoVigencia.Proximo;

    return EstadoVigencia.Vigente;

  }



  @Cron(CronExpression.EVERY_DAY_AT_6AM)

  async actualizarVigenciasDiarias() {

    this.logger.log('Ejecutando cron de vigencias...');



    const anexos = await this.prisma.anexoVigencia.findMany();

    const manana = new Date();

    manana.setDate(manana.getDate() + 1);

    manana.setHours(0, 0, 0, 0);



    for (const anexo of anexos) {

      const nuevoEstado = this.calcularEstado(anexo.fechaVencimiento);



      if (nuevoEstado !== anexo.estado) {

        await this.prisma.anexoVigencia.update({

          where: { id: anexo.id },

          data: { estado: nuevoEstado },

        });

      }



      const vencimiento = new Date(anexo.fechaVencimiento);

      vencimiento.setHours(0, 0, 0, 0);



      if (vencimiento.getTime() === manana.getTime()) {

        const mensaje = `El documento "${anexo.titulo}" vence mañana. Responsable: ${anexo.responsable}.`;

        await this.enviarAlerta(anexo.responsable, mensaje, anexo.id);

      }

    }



    this.logger.log('Cron de vigencias completado.');

  }



  private async enviarAlerta(responsable: string, mensaje: string, anexoId: string) {

    const usuario = await this.prisma.usuario.findFirst({

      where: { correo: { contains: responsable.split('@')[0] ?? responsable } },

    });



    if (usuario) {

      await this.notificaciones.crear(usuario.id, mensaje, 'vigencia');

    }



    if (this.transporter && responsable.includes('@')) {

      try {

        await this.transporter.sendMail({

          from: this.config.get('SMTP_FROM') ?? 'planeacion@uniautonoma.edu.co',

          to: responsable.includes('@') ? responsable : undefined,

          subject: '[SIAC] Alerta de vencimiento',

          text: mensaje,

        });

      } catch (error) {

        this.logger.error(`Fallo SMTP para anexo ${anexoId}: ${error}`);

      }

    }

  }

}


