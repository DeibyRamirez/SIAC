import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlcanceTramiteSIAC, EstadoEvidencia, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { ServicioAlcancePrograma } from '../common/alcance/servicio-alcance-programa';
import { calcularSemaforoAvance } from '../dominio/panel-siac';
import { AvanceProcesoSIACService } from './avance-proceso-siac.service';
import { tramitePorTipo } from './catalogo-tramites-siac';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { ConteosEstadoPrograma } from './programas.service';

export interface UsuarioInstitucionToken {
  id: string;
  rol: RolUsuario;
}

@Injectable()
export class InstitucionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avanceProceso: AvanceProcesoSIACService,
    private readonly alcance: ServicioAlcancePrograma,
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
          ? 'Completado — pendiente resolución MEN'
          : progreso.avanceGlobal >= 100
            ? 'Completado'
            : 'En progreso',
      evidencias,
      conteosEstado,
    };
  }

  async obtenerProgreso(usuario?: UsuarioInstitucionToken) {
    if (usuario) {
      await this.exigirAccesoProgresoInstitucional(usuario);
    }
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');
    return this.avanceProceso.calcularProgresoInstitucion(institucion.id);
  }

  private async exigirAccesoProgresoInstitucional(usuario: UsuarioInstitucionToken) {
    if (
      usuario.rol === RolUsuario.Administrador ||
      usuario.rol === RolUsuario.SuperAdmin
    ) {
      return;
    }
    if (usuario.rol === RolUsuario.Cargador || usuario.rol === RolUsuario.Revisor) {
      const responsable = await this.alcance.esResponsableProcesoInstitucional(usuario.id);
      if (!responsable) {
        throw new ForbiddenException(
          'No está asignado como responsable del proceso institucional (G3/G4).',
        );
      }
      return;
    }
    throw new ForbiddenException('No tiene permiso para consultar el progreso institucional.');
  }

  async obtenerResumen() {
    const institucion = await this.prisma.institucion.findFirst();
    if (!institucion) throw new NotFoundException('Institución no configurada.');
    const tramite = tramitePorTipo(institucion.tipoTramiteActivo);
    return {
      id: institucion.id,
      nombre: institucion.nombre,
      codigo: institucion.codigo,
      tipoTramiteActivo: institucion.tipoTramiteActivo,
      nombreTramite: tramite.nombre,
    };
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
