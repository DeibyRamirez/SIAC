import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfiguracionSiacService } from '../configuracion/configuracion-siac.service';
import { calcularSemaforoVigencia, ColorSemaforoVigencia } from '../dominio/panel-siac';
import { PrismaService } from '../prisma/prisma.module';
import {
  AlcancePaqueteVigencia,
  calcularReferenciaDemoVigencia,
} from './paquetes-registro-vigencia.service';

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
    return this.config.get<number>('vigenciaDuracionPruebaSeg') ?? 420;
  }

  intervaloPruebaSeg(): number {
    return this.config.get<number>('vigenciaIntervaloPruebaSeg') ?? 10;
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
    const umbrales = this.configuracion.obtener();
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
    const referencia = activa
      ? calcularReferenciaDemoVigencia(
          fechaResolucion,
          inicio,
          ahora,
          this.duracionPruebaSeg(),
          umbrales.aniosVigencia,
        )
      : new Date();

    const semaforoVigencia = calcularSemaforoVigencia(fechaResolucion, referencia, umbrales);

    return {
      modoPrueba: this.modoPruebaActivo(),
      activa,
      semaforoVigencia,
      segundosRestantes,
      fraccion,
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
