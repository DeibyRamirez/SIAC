import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { ConfigService } from '@nestjs/config';

import * as nodemailer from 'nodemailer';

import { PrismaService } from '../prisma/prisma.module';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { EstadoVigencia, Prisma, TipoEvidencia } from '@prisma/client';
import { decodificarNombreArchivoMultipart } from '../almacenamiento/utilidades-nombre-archivo';
import { calcularEstadoAnexo, calcularVencimientoAnexo } from '../dominio/vigencia-anexo';
import { ActualizarAnexoDto, CrearAnexoConArchivoDto } from './dto/anexo-vigencia.dto';



// Los formatos admitidos en anexos (PDF/DOC/DOCX) siguen pendientes de decisión del PO; no se cambian aquí.
const TIPOS_DOCUMENTO = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];



@Injectable()

export class VigenciasService implements OnModuleInit {

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



  /** R-D 3b: deja constancia en el log si el bucket de anexos no existe (no bloquea el arranque). */
  async onModuleInit(): Promise<void> {
    try {
      const buckets = await this.almacenamiento.verificarBuckets();
      const documentos = buckets.find((b) => b.tipo === 'documentos');
      if (documentos && !documentos.existe) {
        this.logger.error(
          `El bucket de anexos "${documentos.bucket}" no está disponible en Storage (${documentos.error}). ` +
            'Las cargas de Vigencias fallarán hasta crearlo (S3_BUCKET_DOCUMENTOS).',
        );
      }
    } catch (error) {
      this.logger.warn(`No se pudo verificar el bucket de anexos: ${(error as Error).message}`);
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
    // R-D 3e: el estado se calcula al consultar; la columna solo la refresca el cron.
    const estado = calcularEstadoAnexo(anexo.fechaVencimiento, hoy);
    const inicio = new Date(anexo.fechaCarga);

    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(anexo.fechaVencimiento);

    fin.setHours(0, 0, 0, 0);



    const totalDias = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));

    const transcurridos = Math.max(0, Math.ceil((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));

    const porcentajeTranscurrido = Math.min(100, Math.round((transcurridos / totalDias) * 100));



    return { ...anexo, estado, porcentajeTranscurrido, totalDias, diasTranscurridos: transcurridos };

  }



  async crearAnexoConArchivo(dto: CrearAnexoConArchivoDto, archivo: Express.Multer.File) {
    // R-D 3c: falta de archivo o formato inválido es un error del cliente (400), no un 404.
    if (!archivo) throw new BadRequestException('Se requiere un archivo para el anexo.');
    if (!TIPOS_DOCUMENTO.includes(archivo.mimetype)) {
      throw new BadRequestException(
        `Formato de archivo no permitido (${archivo.mimetype || 'desconocido'}). Use PDF, DOC o DOCX.`,
      );
    }

    // Vencimiento desde el certificado (PO, 06/10): fecha de vencimiento o expedición + años.
    const fechaExpedicion = dto.fechaExpedicion ? fechaUtc(dto.fechaExpedicion) : null;
    const fechaVencimiento = calcularVencimientoAnexo({
      fechaVencimiento: dto.fechaVencimiento ? fechaUtc(dto.fechaVencimiento) : null,
      fechaExpedicion,
      aniosVigencia: dto.aniosVigencia,
    });
    if (!fechaVencimiento) {
      throw new BadRequestException(
        'Indique la fecha de vencimiento del certificado o su fecha de expedición y los años de vigencia.',
      );
    }
    await this.validarEvidenciaDelPrograma(dto.evidenciaId, dto.programaId);

    const datos = {
      titulo: dto.titulo,
      programaId: dto.programaId,
      categoria: dto.categoria,
      evidenciaId: dto.evidenciaId,
      tipo: dto.tipo?.trim() || dto.categoria,
      carpeta: dto.carpeta?.trim() || 'general',
      aniosVigencia: dto.aniosVigencia ?? 7,
      fechaExpedicion,
      responsable: dto.responsable,
    };
    const nombreArchivo = decodificarNombreArchivoMultipart(archivo.originalname);
    const fechaCarga = new Date();
    const estado = this.calcularEstado(fechaVencimiento);
    const clave = this.almacenamiento.generarClaveDocumento(datos.carpeta, nombreArchivo);

    // R-D 3d: primero se sube el archivo y solo si funciona se crea la fila. Ya no hay
    // reversión silenciosa: el fallo queda en el log y el cliente recibe el motivo.
    try {
      await this.almacenamiento.subirArchivo(archivo.buffer, clave, 'documentos', archivo.mimetype);
    } catch (error) {
      throw this.errorSubidaAnexo(error, datos.titulo, clave);
    }

    try {
      const anexo = await this.prisma.anexoVigencia.create({
        data: {
          ...datos,
          fechaCarga,
          fechaVencimiento,
          estado,
          nombreArchivo,
          rutaArchivo: clave,
          mimeType: archivo.mimetype,
        },
        include: { programa: { select: { id: true, nombre: true, codigo: true } } },
      });
      return this.enriquecerAnexo(anexo);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el anexo "${datos.titulo}" tras subir ${clave}: ${(error as Error).message}. Se elimina el archivo.`,
      );
      await this.almacenamiento.eliminarArchivo(clave, 'documentos').catch((errorBorrado) =>
        this.logger.error(`No se pudo eliminar el archivo huérfano ${clave}: ${errorBorrado}`),
      );
      throw error;
    }
  }

  /** Traduce un fallo de Storage en una respuesta útil y lo registra con su causa. */
  private errorSubidaAnexo(error: unknown, titulo: string, clave: string): HttpException {
    const detalle = error as { name?: string; Code?: string } | undefined;
    const nombre = detalle?.name ?? detalle?.Code ?? 'Error';
    const motivo = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Fallo al subir el anexo "${titulo}" al bucket de documentos (clave ${clave}): ${nombre}: ${motivo}`,
    );
    if (nombre === 'NoSuchBucket') {
      return new ServiceUnavailableException(
        'El bucket de documentos no existe en Storage. Pida a TI crearlo (S3_BUCKET_DOCUMENTOS) e intente de nuevo. No se creó el anexo.',
      );
    }
    if (nombre === 'InvalidKey' || /invalid key/i.test(motivo)) {
      return new BadRequestException(
        'Storage rechazó el nombre del archivo. Renómbrelo sin caracteres especiales e intente de nuevo. No se creó el anexo.',
      );
    }
    return new BadGatewayException(
      `No se pudo guardar el archivo en Storage (${motivo}). No se creó el anexo.`,
    );
  }

  async actualizarAnexo(id: string, dto: ActualizarAnexoDto) {
    const anexo = await this.prisma.anexoVigencia.findUnique({ where: { id } });
    if (!anexo) throw new NotFoundException('Anexo no encontrado.');
    const evidenciaId = dto.evidenciaId ?? anexo.evidenciaId;
    if (!anexo.rutaArchivo || !evidenciaId) {
      throw new ConflictException(
        'Este anexo no tiene documento o evidencia vinculada. Vincúlelo a una evidencia (evidenciaId) o cárguelo de nuevo con su documento.',
      );
    }
    if (dto.evidenciaId) await this.validarEvidenciaDelPrograma(dto.evidenciaId, anexo.programaId);

    const data: Prisma.AnexoVigenciaUncheckedUpdateInput = {
      titulo: dto.titulo,
      responsable: dto.responsable,
      categoria: dto.categoria,
      evidenciaId: dto.evidenciaId,
    };
    if (dto.fechaVencimiento) {
      data.fechaVencimiento = fechaUtc(dto.fechaVencimiento);
      data.estado = this.calcularEstado(data.fechaVencimiento as Date);
    }
    const actualizado = await this.prisma.anexoVigencia.update({ where: { id }, data });
    return this.enriquecerAnexo(actualizado);
  }

  /** La evidencia vinculada debe existir, ser un documento guía y pertenecer al mismo programa. */
  private async validarEvidenciaDelPrograma(evidenciaId: string, programaId: string) {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id: evidenciaId },
      select: { programaId: true, tipoEvidencia: true, codigoGuia: true },
    });
    if (!evidencia || evidencia.programaId !== programaId) {
      throw new BadRequestException('La evidencia vinculada no existe o no pertenece al programa del anexo.');
    }
    if (evidencia.tipoEvidencia !== TipoEvidencia.DocumentoGuia || !evidencia.codigoGuia) {
      throw new BadRequestException('El anexo debe vincularse a un documento guía (G1–G4), no a otro tipo de evidencia.');
    }
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
    return calcularEstadoAnexo(fechaVencimiento);
  }



  @Cron(CronExpression.EVERY_DAY_AT_6AM)

  async actualizarVigenciasDiarias() {

    this.logger.log('Ejecutando cron de vigencias...');



    const anexos = await this.prisma.anexoVigencia.findMany();

    const manana = new Date();

    manana.setDate(manana.getDate() + 1);

    manana.setHours(0, 0, 0, 0);



    for (const anexo of anexos) {

      // El estado se calcula al consultar (R-D 3e); el cron ya no reescribe la columna, así no choca
      // con el CHECK de documento y evidencia en los anexos históricos.
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

/** Fecha AAAA-MM-DD a medianoche UTC. */
function fechaUtc(valor: string): Date {
  return new Date(`${valor.slice(0, 10)}T00:00:00.000Z`);
}
