import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import {
  calcularReferenciaDemoVigencia,
  calcularSegundosRestantesVigencia,
  calcularSemaforoVigencia,
  ColorSemaforoVigencia,
  EscalaDemoVigencia,
} from '../dominio/panel-siac';
import { PrismaService } from '../prisma/prisma.module';
import { AlcancePaqueteVigencia } from './paquetes-registro-vigencia.service';

export interface SesionDemoVigencia {
  alcance: AlcancePaqueteVigencia;
  entidadId: string;
  inicioAtMs: number;
}

export interface EstadoDemoVigencia {
  modoPrueba: boolean;
  activa: boolean;
  semaforoVigencia: ColorSemaforoVigencia;
  segundosRestantes: number;
  fraccion: number;
}

export interface VigenciaEntidad {
  semaforo: ColorSemaforoVigencia;
  segundosRestantes: number;
  modoPrueba: boolean;
}

@Injectable()
export class VigenciaDemoService {
  private readonly sesiones = new Map<string, SesionDemoVigencia>();

  constructor(
    private readonly config: ConfigService,
    private readonly configuracion: ConfiguracionSiacService,
    private readonly prisma: PrismaService,
  ) {}

  modoPruebaActivo(): boolean {
    return this.config.get<boolean>('vigenciaModoPrueba') === true;
  }

  duracionPruebaSeg(): number {
    return this.config.get<number>('vigenciaDuracionPruebaSeg') ?? 300;
  }

  /** Intervalo del tick del modo prueba (VIGENCIA_INTERVALO_PRUEBA_SEG); 10 s si falta o no es válido. */
  intervaloPruebaSeg(): number {
    const valor = this.config.get<number>('vigenciaIntervaloPruebaSeg');
    return typeof valor === 'number' && Number.isFinite(valor) && valor >= 1 ? valor : 10;
  }

  /** Escala de la demo activa (§0): amarillo 5/7 ≈ 214 s, rojo 5,5/7 ≈ 236 s, vencido 300 s. */
  escalaSesion(sesion: SesionDemoVigencia): EscalaDemoVigencia {
    return {
      inicioMs: sesion.inicioAtMs,
      duracionMs: this.duracionPruebaSeg() * 1000,
    };
  }

  private clave(alcance: AlcancePaqueteVigencia, entidadId: string): string {
    return `${alcance}:${entidadId}`;
  }

  iniciar(alcance: AlcancePaqueteVigencia, entidadId: string): SesionDemoVigencia {
    if (!this.modoPruebaActivo()) {
      throw new Error('El modo prueba de vigencia no está habilitado en el servidor.');
    }
    const sesion: SesionDemoVigencia = {
      alcance,
      entidadId,
      inicioAtMs: Date.now(),
    };
    this.sesiones.set(this.clave(alcance, entidadId), sesion);
    return sesion;
  }

  detener(alcance: AlcancePaqueteVigencia, entidadId: string): void {
    this.sesiones.delete(this.clave(alcance, entidadId));
  }

  obtenerSesion(alcance: AlcancePaqueteVigencia, entidadId: string): SesionDemoVigencia | null {
    return this.sesiones.get(this.clave(alcance, entidadId)) ?? null;
  }

  listarSesionesActivas(): SesionDemoVigencia[] {
    return [...this.sesiones.values()];
  }

  async consultarEstado(
    alcance: AlcancePaqueteVigencia,
    entidadId: string,
  ): Promise<EstadoDemoVigencia> {
    const umbrales = await this.configuracion.cargar();
    const sesion = this.obtenerSesion(alcance, entidadId);
    const fechaResolucion = await this.obtenerFechaResolucion(alcance, entidadId);
    if (!fechaResolucion) {
      return {
        modoPrueba: this.modoPruebaActivo(),
        activa: false,
        semaforoVigencia: 'SinVigencia',
        segundosRestantes: 0,
        fraccion: 0,
      };
    }

    const ahora = Date.now();
    const duracionMs = this.duracionPruebaSeg() * 1000;
    const activa = Boolean(sesion);
    const inicio = sesion?.inicioAtMs ?? ahora;
    const transcurrido = Math.max(0, ahora - inicio);
    const fraccion = activa ? Math.min(1, transcurrido / duracionMs) : 0;
    const segundosRestantes = activa ? Math.max(0, Math.ceil((duracionMs - transcurrido) / 1000)) : 0;
    const referencia = new Date(ahora);

    const semaforoVigencia = calcularSemaforoVigencia(
      fechaResolucion,
      referencia,
      umbrales,
      sesion ? this.escalaSesion(sesion) : undefined,
    );

    return {
      modoPrueba: this.modoPruebaActivo(),
      activa,
      semaforoVigencia,
      segundosRestantes,
      fraccion,
    };
  }

  /**
   * §0: vigencia de una entidad para `GET /programas/:id/vigencia`. En modo prueba con sesión
   * activa usa la escala acelerada; fuera de la demo, el reloj real.
   */
  async consultarVigenciaEntidad(
    alcance: AlcancePaqueteVigencia,
    entidadId: string,
  ): Promise<VigenciaEntidad> {
    const umbrales = await this.configuracion.cargar();
    const fechaResolucion = await this.obtenerFechaResolucion(alcance, entidadId);
    const ahora = new Date();
    const sesion = this.obtenerSesion(alcance, entidadId);
    const escala = sesion ? this.escalaSesion(sesion) : undefined;

    return {
      semaforo: calcularSemaforoVigencia(fechaResolucion, ahora, umbrales, escala),
      segundosRestantes: calcularSegundosRestantesVigencia(
        fechaResolucion,
        ahora,
        umbrales,
        escala,
      ),
      modoPrueba: this.modoPruebaActivo(),
    };
  }

  private async obtenerFechaResolucion(
    alcance: AlcancePaqueteVigencia,
    entidadId: string,
  ): Promise<Date | null> {
    if (alcance === 'Programa') {
      const programa = await this.prisma.programa.findUnique({
        where: { id: entidadId },
        select: { fechaResolucion: true },
      });
      return programa?.fechaResolucion ?? null;
    }
    const institucion = await this.prisma.institucion.findUnique({
      where: { id: entidadId },
      select: { fechaResolucion: true },
    });
    return institucion?.fechaResolucion ?? null;
  }
}
