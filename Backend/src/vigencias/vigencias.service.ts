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

import { PrismaService } from '../prisma/prisma.module';

import { NotificacionesDespachoService } from '../notificaciones/notificaciones-despacho.service';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { EstadoVigencia, Prisma, TipoEvidencia } from '@prisma/client';
import { decodificarNombreArchivoMultipart } from '../almacenamiento/utilidades-nombre-archivo';
import { calcularEstadoAnexo, calcularVencimientoAnexo } from '../dominio/vigencia-anexo';
import { plantillaAnexoVenceManana } from '../correo/plantillas';
import { mensajeAnexoVenceManana } from '../correo/plantillas/anexos';
import { claveAnexoD1 } from '../notificaciones/claves-evento';
import { idsGestionYRevisores } from '../notificaciones/destinatarios-alertas';
import { ActualizarAnexoDto, CrearAnexoConArchivoDto } from './dto/anexo-vigencia.dto';
import { EvaluadorVigenciaRegistroService } from './evaluador-vigencia-registro.service';
import { ejecutarComoSistema } from '../prisma/contexto-sistema';

/** Zona horaria institucional (CUAC Popayán) para el cron diario de vigencias. */
export const ZONA_HORARIA_SIAC = 'America/Bogota';



// Los formatos admitidos en anexos (PDF/DOC/DOCX) siguen pendientes de decisión del PO; no se cambian aquí.
const TIPOS_DOCUMENTO = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];



@Injectable()

export class VigenciasService implements OnModuleInit {

  private readonly logger = new Logger(VigenciasService.name);

  constructor(

    private readonly prisma: PrismaService,

    private readonly notificacionesDespacho: NotificacionesDespachoService,

    private readonly almacenamiento: AlmacenamientoService,

    private readonly evaluadorVigenciaRegistro: EvaluadorVigenciaRegistroService,

  ) {}



  /** R-D 3b: deja constancia en el log si algún bucket S3 no existe (no bloquea el arranque). */
  async onModuleInit(): Promise<void> {
    try {
      const buckets = await this.almacenamiento.verificarBuckets();
      for (const bucket of buckets) {
        if (bucket.existe) continue;
        const detalle = `${bucket.bucket} (${bucket.error ?? 'no disponible'})`;
        if (bucket.tipo === 'documentos') {
          this.logger.error(
            `Bucket de anexos "${detalle}". Las cargas de Vigencias fallarán hasta crearlo (S3_BUCKET_DOCUMENTOS).`,
          );
        } else if (bucket.tipo === 'plantillas') {
          this.logger.error(
            `Bucket de plantillas "${detalle}". Descargas/subidas de guías fallarán (S3_BUCKET_PLANTILLAS).`,
          );
        } else {
          this.logger.error(
            `Bucket de evidencias "${detalle}". Cargas de evidencias fallarán (S3_BUCKET).`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`No se pudo verificar buckets de Storage: ${(error as Error).message}`);
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
    const programa = await this.prisma.programa.findUnique({
      where: { id: dto.programaId },
      select: { tipoTramiteActivo: true },
    });
    const clave = this.almacenamiento.generarClaveDocumento(datos.carpeta, nombreArchivo, {
      tipoTramite: programa?.tipoTramiteActivo,
    });

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



  /**
   * T-007.2: único cron diario, 06:00 en Colombia sin depender de la zona del servidor (Render
   * corre en UTC si no se define TZ). `VIGENCIAS_CRON_ZONA` permite otra zona (America/Bogota por defecto).
   * Evalúa anexos D-1 (responsable por coincidencia exacta de correo + Administrador/SuperAdmin
   * activos + Revisores activos del programa del anexo) y
   * transiciones de vigencia de registro de programas e institución.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM, {
    name: 'vigencias-diarias',
    timeZone: process.env.VIGENCIAS_CRON_ZONA ?? ZONA_HORARIA_SIAC,
  })
  async actualizarVigenciasDiarias(): Promise<void> {
    return ejecutarComoSistema(async () => {
      this.logger.log('Ejecutando cron de vigencias...');

      await this.notificarAnexosQueVencenManana();
      await this.evaluadorVigenciaRegistro.evaluarTodasLasEntidades();

      this.logger.log('Cron de vigencias completado.');
    });
  }

  /** D-1: avisos de anexos que vencen mañana; la idempotencia la da `claveAnexoD1`. */
  private async notificarAnexosQueVencenManana(): Promise<void> {
    // fechaVencimiento se guarda como fecha a medianoche UTC (fechaUtc); se compara el día
    // calendario de mañana en la zona del servidor con ese día UTC, sin mezclar zonas horarias.
    const manana = diaCalendarioLocal(1);
    const vencimientoManana = new Date(`${manana}T00:00:00.000Z`);

    const anexos = await this.prisma.anexoVigencia.findMany({
      // Solo vigentes (el estado vencido no recibe recordatorio) y no notificados (clave única).
      where: {
        fechaVencimiento: vencimientoManana,
        estado: { not: EstadoVigencia.Vencido },
      },
      include: { programa: { select: { id: true, nombre: true } } },
    });
    if (anexos.length === 0) return;

    // Gestión (Administrador/SuperAdmin) es la misma para todos; los Revisores dependen del programa.
    const destinatariosPorPrograma = new Map<string, string[]>();
    for (const anexo of anexos) {
      let destinatarios = destinatariosPorPrograma.get(anexo.programaId);
      if (!destinatarios) {
        destinatarios = await idsGestionYRevisores(this.prisma, anexo.programaId);
        destinatariosPorPrograma.set(anexo.programaId, destinatarios);
      }
      await this.avisarAnexoD1(anexo, destinatarios);
    }
  }

  private async avisarAnexoD1(
    anexo: {
      id: string;
      titulo: string;
      fechaVencimiento: Date;
      responsable: string;
      programaId: string;
    },
    idsDestinatarios: string[],
  ): Promise<void> {
    const fechaVencimientoIso = new Date(anexo.fechaVencimiento).toISOString();
    const datos = {
      titulo: anexo.titulo,
      responsable: anexo.responsable,
      fechaVencimientoIso,
      programaId: anexo.programaId,
      anexoId: anexo.id,
    };
    const mensaje = mensajeAnexoVenceManana(datos);
    const plantilla = plantillaAnexoVenceManana(datos);
    const metadata = {
      anexoId: anexo.id,
      programaId: anexo.programaId,
      fechaVencimiento: fechaVencimientoIso,
    };

    const correoResponsable = anexo.responsable.includes('@')
      ? anexo.responsable.trim().toLowerCase()
      : null;
    const usuarioResponsable = correoResponsable
      ? await this.prisma.usuario.findUnique({
          where: { correo: correoResponsable },
          select: { id: true },
        })
      : null;

    if (usuarioResponsable) {
      await this.notificacionesDespacho.notificar({
        claveEvento: claveAnexoD1({
          anexoId: anexo.id,
          fechaVencimientoIso,
          usuarioId: usuarioResponsable.id,
        }),
        usuarioId: usuarioResponsable.id,
        mensaje,
        tipo: 'anexo_vence_manana',
        asuntoCorreo: plantilla.asunto,
        metadata,
        plantilla,
      });
    } else if (correoResponsable) {
      // Responsable sin cuenta: solo correo, con la misma clave idempotente por destinatario.
      await this.notificacionesDespacho.encolarCorreoExterno({
        claveEvento: claveAnexoD1({
          anexoId: anexo.id,
          fechaVencimientoIso,
          usuarioId: `externo:${correoResponsable}`,
        }),
        destinatarioCorreo: correoResponsable,
        mensaje,
        tipo: 'anexo_vence_manana',
        asuntoCorreo: plantilla.asunto,
        metadata,
        plantilla,
      });
    }

    // El responsable ya recibió su aviso arriba; no se le duplica si además es Admin o Revisor.
    for (const usuarioId of idsDestinatarios) {
      if (usuarioId === usuarioResponsable?.id) continue;
      await this.notificacionesDespacho.notificar({
        claveEvento: claveAnexoD1({
          anexoId: anexo.id,
          fechaVencimientoIso,
          usuarioId,
        }),
        usuarioId,
        mensaje,
        tipo: 'anexo_vence_manana',
        asuntoCorreo: plantilla.asunto,
        metadata,
        plantilla,
      });
    }
  }
}

/** Día calendario AAAA-MM-DD en la zona del servidor, desplazado desplazamientoDias. */
export function diaCalendarioLocal(desplazamientoDias = 0, base = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + desplazamientoDias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Fecha AAAA-MM-DD a medianoche UTC. */
function fechaUtc(valor: string): Date {
  return new Date(`${valor.slice(0, 10)}T00:00:00.000Z`);
}
