import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { RolUsuario } from '@prisma/client';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import { plantillaVigencia, UmbralVigenciaCorreo } from '../correo/plantillas';
import { mensajeVigencia } from '../correo/plantillas/vigencia';
import {
  calcularHitosVigencia,
  calcularReferenciaDemoVigencia,
  calcularSemaforoVigencia,
  UmbralesSemaforoVigencia,
} from '../dominio/panel-siac';
import { claveVigencia } from '../notificaciones/claves-evento';
import { NotificacionesDespachoService } from '../notificaciones/notificaciones-despacho.service';
import { PrismaService } from '../prisma/prisma.module';
import { AlcancePaqueteVigencia } from './paquetes-registro-vigencia.service';
import { VigenciaDemoService } from './vigencia-demo.service';

@Injectable()
export class EvaluadorVigenciaRegistroService implements OnModuleInit {
  private readonly logger = new Logger(EvaluadorVigenciaRegistroService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracion: ConfiguracionSiacService,
    private readonly notificacionesDespacho: NotificacionesDespachoService,
    private readonly demo: VigenciaDemoService,
    private readonly config: ConfigService,
  ) { }

  /** Evita que dos ticks del modo prueba se solapen y dupliquen alertas o correos. */
  private evaluacionPruebaEnCurso = false;

  onModuleInit(): void {
    const modoPrueba = this.config.get<boolean>('vigenciaModoPrueba') === true;
    if (process.env.NODE_ENV !== 'production' || !modoPrueba) return;
    const permitido = this.config.get<boolean>('vigenciaModoPruebaPermitirProduccion') === true;
    if (!permitido) {
      throw new Error(
        'VIGENCIA_MODO_PRUEBA no puede estar activo en producción. Desactive la variable de entorno ' +
          'o, solo en un despliegue de staging, defina VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION=true.',
      );
    }
    this.logger.warn(
      'Modo prueba de vigencias ACTIVO con NODE_ENV=production (VIGENCIA_MODO_PRUEBA_PERMITIR_PRODUCCION=true). ' +
        'Usar solo en staging: las notificaciones y correos de vigencia se generan con fechas simuladas.',
    );
  }

  /**
   * Evalúa vigencia de registro MEN (programas e institución) en la fecha de referencia.
   * T-007.3a: relee los umbrales de BD en cada corrida (cambiar mesesRojoVigencia no exige redeploy).
   * T-007.2: 1 aviso por destinatario (Administrador/SuperAdmin/Revisor activos) por transición.
   */
  async evaluarTodasLasEntidades(referencia: Date = new Date()): Promise<void> {
    const umbrales = await this.configuracion.cargar();

    const programas = await this.prisma.programa.findMany({
      where: { fechaResolucion: { not: null } },
      select: {
        id: true,
        nombre: true,
        fechaResolucion: true,
        resoluciones: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    for (const programa of programas) {
      if (!programa.fechaResolucion) continue;
      const evaluacion = this.referenciaEntidad(
        'Programa',
        programa.id,
        programa.fechaResolucion,
        umbrales,
        referencia,
      );
      if (!evaluacion) continue;
      await this.evaluarEntidad({
        alcance: 'Programa',
        entidadId: programa.id,
        nombre: programa.nombre,
        fechaResolucion: programa.fechaResolucion,
        referencia: evaluacion.referencia,
        tokenDemo: evaluacion.tokenDemo,
        resolucionId: programa.resoluciones[0]?.id ?? programa.fechaResolucion.toISOString().slice(0, 10),
        umbrales,
        programaId: programa.id,
      });
    }

    const institucion = await this.prisma.institucion.findFirst({
      where: { fechaResolucion: { not: null } },
      select: {
        id: true,
        nombre: true,
        fechaResolucion: true,
        resoluciones: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (institucion?.fechaResolucion) {
      const evaluacion = this.referenciaEntidad(
        'Institucion',
        institucion.id,
        institucion.fechaResolucion,
        umbrales,
        referencia,
      );
      if (evaluacion) {
        await this.evaluarEntidad({
          alcance: 'Institucion',
          entidadId: institucion.id,
          nombre: institucion.nombre,
          fechaResolucion: institucion.fechaResolucion,
          referencia: evaluacion.referencia,
          tokenDemo: evaluacion.tokenDemo,
          resolucionId:
            institucion.resoluciones[0]?.id ??
            institucion.fechaResolucion.toISOString().slice(0, 10),
          umbrales,
        });
      }
    }
  }

  private referenciaEntidad(
    alcance: AlcancePaqueteVigencia,
    entidadId: string,
    fechaResolucion: Date,
    umbrales: UmbralesSemaforoVigencia,
    ahora: Date,
  ): { referencia: Date; tokenDemo?: string } | null {
    const sesion = this.demo.obtenerSesion(alcance, entidadId);
    if (this.demo.modoPruebaActivo()) {
      if (!sesion) return null;
      return {
        referencia: calcularReferenciaDemoVigencia(
          fechaResolucion,
          sesion.inicioAtMs,
          ahora.getTime(),
          this.demo.duracionPruebaSeg(),
          umbrales.aniosVigencia,
        ),
        tokenDemo: String(sesion.inicioAtMs),
      };
    }
    return { referencia: ahora };
  }

  private async evaluarEntidad(input: {
    alcance: AlcancePaqueteVigencia;
    entidadId: string;
    nombre: string;
    fechaResolucion: Date;
    referencia: Date;
    umbrales: UmbralesSemaforoVigencia;
    programaId?: string;
    resolucionId: string;
    tokenDemo?: string;
  }): Promise<void> {
    const semaforo = calcularSemaforoVigencia(
      input.fechaResolucion,
      input.referencia,
      input.umbrales,
    );
    if (semaforo === 'Verde' || semaforo === 'SinVigencia') return;

    const umbral: UmbralVigenciaCorreo =
      semaforo === 'Amarillo' ? 'amarillo' : semaforo === 'Rojo' ? 'rojo' : 'vencido';
    const tipo =
      umbral === 'amarillo'
        ? 'vigencia_amarilla'
        : umbral === 'rojo'
          ? 'vigencia_roja'
          : 'vigencia_vencida';
    const fechaFinIso = calcularHitosVigencia(
      input.fechaResolucion,
      input.umbrales,
    ).fin.toISOString();
    const datosPlantilla = {
      nombreEntidad: input.nombre,
      aniosVigencia: input.umbrales.aniosVigencia,
      mesesAvisoVigencia: input.umbrales.mesesAvisoVigencia,
      mesesRojoVigencia: input.umbrales.mesesRojoVigencia,
      fechaFinIso,
      ...(input.programaId ? { programaId: input.programaId } : {}),
      ...(input.alcance === 'Institucion' ? { institucionId: input.entidadId } : {}),
    };
    const mensaje = mensajeVigencia(datosPlantilla, umbral);
    const plantilla = plantillaVigencia(umbral, datosPlantilla);
    const metadata = {
      umbral,
      fechaFin: fechaFinIso,
      aniosVigencia: input.umbrales.aniosVigencia,
      ...(input.programaId ? { programaId: input.programaId } : {}),
      ...(input.alcance === 'Institucion' ? { institucionId: input.entidadId } : {}),
    };

    const destinatarios = await this.obtenerDestinatarios(input.programaId);
    for (const usuarioId of destinatarios) {
      await this.notificacionesDespacho.notificar({
        claveEvento: claveVigencia({
          entidadId: input.entidadId,
          resolucionId: input.resolucionId,
          fechaFinIso,
          umbral,
          usuarioId,
          tokenDemo: input.tokenDemo,
        }),
        usuarioId,
        mensaje,
        tipo,
        asuntoCorreo: plantilla.asunto,
        metadata,
        plantilla,
      });
    }
  }

  private async obtenerDestinatarios(programaId?: string): Promise<string[]> {
    const admins = await this.prisma.usuario.findMany({
      where: {
        activo: true,
        rol: { in: [RolUsuario.Administrador, RolUsuario.SuperAdmin] },
      },
      select: { id: true },
    });

    const revisores = programaId
      ? await this.prisma.usuario.findMany({
        where: {
          activo: true,
          rol: RolUsuario.Revisor,
          usuarioProgramas: { some: { programaId } },
        },
        select: { id: true },
      })
      : await this.prisma.usuario.findMany({
        where: { activo: true, rol: RolUsuario.Revisor },
        select: { id: true },
      });

    return [...new Set([...admins, ...revisores].map((u) => u.id))];
  }

  @Interval(10_000)
  async tickModoPrueba(): Promise<void> {
    if (!this.demo.modoPruebaActivo()) return;
    const sesiones = this.demo.listarSesionesActivas();
    if (sesiones.length === 0) return;
    // Con una BD remota (Supabase, connection_limit=1) una evaluación puede tardar más que el
    // intervalo; si se solapan, ambas verían "no notificado" y se duplicarían alertas y correos.
    if (this.evaluacionPruebaEnCurso) return;
    this.evaluacionPruebaEnCurso = true;
    try {
      await this.evaluarTodasLasEntidades();
    } catch (error) {
      this.logger.error(`Error en evaluador de vigencia (modo prueba): ${error}`);
    } finally {
      this.evaluacionPruebaEnCurso = false;
    }
  }
}
