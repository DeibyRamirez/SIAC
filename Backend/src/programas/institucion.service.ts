import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlcanceTramiteSIAC, EstadoEvidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { calcularSemaforoAvance } from '../dominio/panel-siac';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { tramitePorTipo } from './catalogo-tramites-siac';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { ConteosEstadoPrograma } from './programas.service';

@Injectable()
export class InstitucionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avanceProceso: AvanceProcesoSIACService,
  ) {}

  async obtener() {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');

    const progreso = await this.avanceProceso.calcularProgresoInstitucion(institucion.id);
    const evidencias = await this.prisma.evidencia.findMany({
      where: { institucionId: institucion.id },
      select: { estado: true },
    });

    const conteosEstado = this.conteosDesdeEvidencias(evidencias);
    const semaforo = calcularSemaforoAvance(progreso.avanceGlobal);

    return {
      id: institucion.id,
      nombre: institucion.nombre,
      codigo: institucion.codigo,
      tipoTramiteActivo: institucion.tipoTramiteActivo,
      fechaResolucion: institucion.fechaResolucion,
      alcance: AlcanceTramiteSIAC.Institucion,
      porcentajeAvance: progreso.avanceGlobal,
      semaforo,
      estadoProceso:
        progreso.avanceGlobal >= 100 && !institucion.fechaResolucion
          ? 'Completado — pendiente activación de vigencia'
          : progreso.avanceGlobal >= 100
            ? 'Completado'
            : 'En progreso',
      evidencias,
      conteosEstado,
    };
  }

  async obtenerProgreso() {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');
    return this.avanceProceso.calcularProgresoInstitucion(institucion.id);
  }

  async actualizar(dto: ActualizarInstitucionDto) {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');

    if (dto.tipoTramiteActivo !== undefined) {
      const tramite = tramitePorTipo(dto.tipoTramiteActivo);
      if (tramite.alcance !== AlcanceTramiteSIAC.Institucion) {
        throw new BadRequestException('El trámite debe ser de alcance institucional (G3/G4).');
      }
    }

    await this.prisma.institucion.update({
      where: { id: institucion.id },
      data: {
        ...(dto.tipoTramiteActivo !== undefined
          ? { tipoTramiteActivo: dto.tipoTramiteActivo }
          : {}),
      },
    });

    return this.obtener();
  }

  async activarVigencia() {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');

    if (institucion.fechaResolucion) {
      throw new BadRequestException('La vigencia institucional ya está activa.');
    }

    const progreso = await this.avanceProceso.calcularProgresoInstitucion(institucion.id);
    if (progreso.avanceGlobal < 100) {
      throw new BadRequestException(
        'El proceso documental institucional debe estar al 100% antes de activar la vigencia.',
      );
    }

    await this.prisma.institucion.update({
      where: { id: institucion.id },
      data: { fechaResolucion: new Date() },
    });

    return this.obtener();
  }

  private conteosDesdeEvidencias(
    evidencias: { estado: EstadoEvidencia }[],
  ): ConteosEstadoPrograma {
    const conteos: ConteosEstadoPrograma = {
      borrador: 0,
      enRevision: 0,
      conObservaciones: 0,
      cumple: 0,
      validado: 0,
      rechazado: 0,
    };

    for (const ev of evidencias) {
      if (ev.estado === EstadoEvidencia.Borrador) conteos.borrador += 1;
      if (ev.estado === EstadoEvidencia.EnRevision) conteos.enRevision += 1;
      if (ev.estado === EstadoEvidencia.ConObservaciones) conteos.conObservaciones += 1;
      if (ev.estado === EstadoEvidencia.Cumple) conteos.cumple += 1;
      if (ev.estado === EstadoEvidencia.Validado) conteos.validado += 1;
      if (ev.estado === EstadoEvidencia.Rechazado) conteos.rechazado += 1;
    }

    return conteos;
  }
}
