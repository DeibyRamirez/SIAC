import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { RolUsuario } from '@prisma/client';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import { calcularSemaforoVigencia, UmbralesSemaforoVigencia } from '../dominio/panel-siac';
import { NotificacionesDespachoService } from '../notificaciones/notificaciones-despacho.service';
import { PrismaService } from '../prisma/prisma.module';
import {
  AlcancePaqueteVigencia,
  calcularReferenciaDemoVigencia,
} from './paquetes-registro-vigencia.service';
import { VigenciaDemoService } from './vigencia-demo.service';

type UmbralVigenciaRegistro = 'amarillo' | 'vencido';

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

  /** Evalúa vigencia de registro MEN (programas e institución) en la fecha de referencia. */
  async evaluarTodasLasEntidades(referencia: Date = new Date()): Promise<void> {
    const umbrales = this.configuracion.obtener();

    const programas = await this.prisma.programa.findMany({
      where: { fechaResolucion: { not: null } },
      select: { id: true, nombre: true, fechaResolucion: true },
    });
    for (const programa of programas) {
      if (!programa.fechaResolucion) continue;
      const ref = this.referenciaEntidad('Programa', programa.id, programa.fechaResolucion, umbrales);
      if (!ref) continue;
      await this.evaluarEntidad({
        alcance: 'Programa',
        entidadId: programa.id,
        nombre: programa.nombre,
        fechaResolucion: programa.fechaResolucion,
        referencia: ref,
        umbrales,
        programaId: programa.id,
      });
    }

    const institucion = await this.prisma.institucion.findFirst({
      where: { fechaResolucion: { not: null } },
      select: { id: true, nombre: true, fechaResolucion: true },
    });
    if (institucion?.fechaResolucion) {
      const ref = this.referenciaEntidad(
        'Institucion',
        institucion.id,
        institucion.fechaResolucion,
        umbrales,
      );
      if (ref) {
        await this.evaluarEntidad({
          alcance: 'Institucion',
          entidadId: institucion.id,
          nombre: institucion.nombre,
          fechaResolucion: institucion.fechaResolucion,
          referencia: ref,
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
  ): Date | null {
    const sesion = this.demo.obtenerSesion(alcance, entidadId);
    if (this.demo.modoPruebaActivo()) {
      if (!sesion) return null;
      return calcularReferenciaDemoVigencia(
        fechaResolucion,
        sesion.inicioAtMs,
        Date.now(),
        this.demo.duracionPruebaSeg(),
        umbrales.aniosVigencia,
      );
    }
    return new Date();
  }

  private async evaluarEntidad(input: {
    alcance: AlcancePaqueteVigencia;
    entidadId: string;
    nombre: string;
    fechaResolucion: Date;
    referencia: Date;
    umbrales: UmbralesSemaforoVigencia;
    programaId?: string;
  }): Promise<void> {
    const semaforo = calcularSemaforoVigencia(
      input.fechaResolucion,
      input.referencia,
      input.umbrales,
    );
    if (semaforo === 'Verde' || semaforo === 'SinVigencia') return;

    const umbral: UmbralVigenciaRegistro = semaforo === 'Amarillo' ? 'amarillo' : 'vencido';
    const tipo = umbral === 'amarillo' ? 'vigencia_amarilla' : 'vigencia_vencida';
    const mensaje = this.mensajeNotificacion(umbral, input.nombre, input.umbrales.aniosVigencia);

    const metadata = {
      umbral,
      ...(input.programaId ? { programaId: input.programaId } : {}),
      ...(input.alcance === 'Institucion' ? { institucionId: input.entidadId } : {}),
    };

    const destinatarios = await this.obtenerDestinatarios(input.programaId);
    for (const usuarioId of destinatarios) {
      const yaNotificado = await this.prisma.alertaInApp.findFirst({
        where: {
          usuarioId,
          tipo,
          AND: [
            { metadata: { path: ['umbral'], equals: umbral } },
            input.programaId
              ? { metadata: { path: ['programaId'], equals: input.programaId } }
              : { metadata: { path: ['institucionId'], equals: input.entidadId } },
          ],
        },
      });
      if (yaNotificado) continue;

      await this.notificacionesDespacho.notificar({
        usuarioId,
        mensaje,
        tipo,
        asuntoCorreo:
          umbral === 'amarillo'
            ? '[SIAC] Inicio de ventana de renovación'
            : '[SIAC] Vigencia de registro vencida',
        metadata,
      });
    }
  }

  private mensajeNotificacion(
    umbral: UmbralVigenciaRegistro,
    nombreEntidad: string,
    aniosVigencia: number,
  ): string {
    if (umbral === 'amarillo') {
      return `La vigencia de registro de ${nombreEntidad} entró en ventana de renovación (año 6 de ${aniosVigencia}). Inicie el proceso SIAC de renovación cuando corresponda.`;
    }
    return `La vigencia de registro de ${nombreEntidad} ha superado los ${aniosVigencia} años. Inicie el proceso de renovación.`;
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
