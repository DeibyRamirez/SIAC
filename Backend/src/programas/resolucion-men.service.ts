import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EstadoEvidencia, Prisma, TipoEvidencia, TipoTramiteSIAC } from '@prisma/client';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { decodificarNombreArchivoMultipart } from '../almacenamiento/utilidades-nombre-archivo';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import { motivoRechazoPdf } from '../dominio/archivo-pdf';
import { calcularFechaFinVigencia, calcularSemaforoVigencia } from '../dominio/panel-siac';
import { PrismaService } from '../prisma/prisma.module';
import { AvanceProcesoSIACService, ProgresoProcesoSIAC } from './avance-proceso-siac.service';
import { CargarResolucionDto } from './dto/cargar-resolucion.dto';

interface UsuarioRegistro {
  id: string;
}

type Propietario =
  | { programaId: string; institucionId?: undefined }
  | { institucionId: string; programaId?: undefined };

/**
 * Resolución MEN e inicio de vigencia (decisión del PO, 06/10; reemplaza «activar vigencia»).
 * Solo se acepta cuando todos los documentos del trámite están aprobados; el Administrador
 * registra la fecha y el número reales y el fin de vigencia se calcula al consultar.
 */
@Injectable()
export class ResolucionMenService {
  private readonly logger = new Logger(ResolucionMenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly avanceProceso: AvanceProcesoSIACService,
    private readonly configuracion: ConfiguracionSiacService,
  ) {}

  async cargarParaPrograma(
    programaId: string,
    dto: CargarResolucionDto,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioRegistro,
  ) {
    const programa = await this.prisma.programa.findUnique({ where: { id: programaId } });
    if (!programa) throw new NotFoundException('Programa no encontrado.');
    const progreso = await this.avanceProceso.calcularProgresoPrograma(programaId);
    return this.cargar({
      propietario: { programaId },
      nombreEntidad: programa.nombre,
      tipoTramite: programa.tipoTramiteActivo,
      progreso,
      dto,
      archivo,
      usuario,
    });
  }

  async cargarParaInstitucion(
    dto: CargarResolucionDto,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioRegistro,
  ) {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');
    const progreso = await this.avanceProceso.calcularProgresoInstitucion(institucion.id);
    return this.cargar({
      propietario: { institucionId: institucion.id },
      nombreEntidad: institucion.nombre,
      tipoTramite: institucion.tipoTramiteActivo,
      progreso,
      dto,
      archivo,
      usuario,
    });
  }

  private async cargar(input: {
    propietario: Propietario;
    nombreEntidad: string;
    tipoTramite: TipoTramiteSIAC;
    progreso: ProgresoProcesoSIAC;
    dto: CargarResolucionDto;
    archivo: Express.Multer.File | undefined;
    usuario: UsuarioRegistro;
  }) {
    const { propietario, progreso, dto, archivo, usuario, tipoTramite } = input;

    // 409: el trámite todavía tiene documentos sin aprobar.
    if (!progreso.puedeCargarResolucion) {
      throw new ConflictException(
        `No se puede cargar la resolución: faltan documentos aprobados del trámite (${progreso.documentosPendientes.join(', ')}).`,
      );
    }

    const fechaResolucion = this.validarFecha(dto.fechaResolucion);
    const numero = dto.numero.trim();
    if (!numero) throw new BadRequestException('El número de la resolución es obligatorio.');

    if (!archivo) throw new BadRequestException('Adjunte el PDF de la resolución MEN.');
    const motivo = motivoRechazoPdf(archivo);
    if (motivo) throw new BadRequestException(motivo);

    const nombreArchivo = decodificarNombreArchivoMultipart(archivo.originalname);
    const clave = this.almacenamiento.generarClaveDocumento('resoluciones-men', nombreArchivo, {
      tipoTramite,
    });
    try {
      await this.almacenamiento.subirArchivo(archivo.buffer, clave, 'documentos', 'application/pdf');
    } catch (error) {
      this.logger.error(`Fallo al subir la resolución MEN (${clave}): ${(error as Error).message}`);
      throw new BadGatewayException(
        `No se pudo guardar el PDF en Storage (${(error as Error).message}). No se registró la resolución.`,
      );
    }

    try {
      const resolucion = await this.prisma.$transaction(async (tx) => {
        const evidencia = await tx.evidencia.create({
          data: {
            nombre: `Resolución MEN n.º ${numero} — ${input.nombreEntidad}`,
            tipoEvidencia: TipoEvidencia.ResolucionMen,
            estado: EstadoEvidencia.Validado,
            periodo: periodoDeFecha(fechaResolucion),
            autorId: usuario.id,
            nombreArchivo,
            rutaArchivo: clave,
            mimeType: 'application/pdf',
            tamanoBytes: archivo.size,
            ...propietario,
          },
        });
        const creada = await tx.resolucionMen.create({
          data: {
            evidenciaId: evidencia.id,
            numero,
            fechaResolucion,
            tipoTramite: input.tipoTramite,
            registradoPorId: usuario.id,
            ...propietario,
          },
        });
        await this.actualizarFechaPropietario(tx, propietario, fechaResolucion);
        return creada;
      });

      const umbrales = this.configuracion.obtener();
      return {
        ...resolucion,
        fechaFinVigencia: calcularFechaFinVigencia(fechaResolucion, umbrales.aniosVigencia),
        semaforoVigencia: calcularSemaforoVigencia(fechaResolucion, new Date(), umbrales),
      };
    } catch (error) {
      this.logger.error(
        `No se pudo registrar la resolución MEN tras subir ${clave}: ${(error as Error).message}. Se elimina el archivo.`,
      );
      await this.almacenamiento.eliminarArchivo(clave, 'documentos').catch(() => undefined);
      throw error;
    }
  }

  private validarFecha(valor: string): Date {
    const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor ?? '');
    if (!coincide) throw new BadRequestException('La fecha de la resolución debe tener el formato AAAA-MM-DD.');
    const fecha = new Date(Date.UTC(Number(coincide[1]), Number(coincide[2]) - 1, Number(coincide[3])));
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
      throw new BadRequestException('La fecha de la resolución no es válida.');
    }
    if (fecha.getTime() > Date.now()) {
      throw new BadRequestException('La fecha de la resolución no puede estar en el futuro.');
    }
    return fecha;
  }

  private async actualizarFechaPropietario(
    tx: Prisma.TransactionClient,
    propietario: Propietario,
    fechaResolucion: Date,
  ) {
    if (propietario.programaId) {
      await tx.programa.update({ where: { id: propietario.programaId }, data: { fechaResolucion } });
    } else {
      await tx.institucion.update({ where: { id: propietario.institucionId }, data: { fechaResolucion } });
    }
  }
}

/** Periodo académico (AAAA-1 o AAAA-2) de la fecha de la resolución. */
function periodoDeFecha(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${fecha.getUTCMonth() < 6 ? 1 : 2}`;
}
