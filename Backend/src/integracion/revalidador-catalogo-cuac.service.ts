import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogoCuacPersistenciaService, INTERVALO_REVALIDACION_CUAC_MS } from './catalogo-cuac-persistencia.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';
import { esSincronizacionCuacHabilitada } from './config-catalogo-cuac';

@Injectable()
export class RevalidadorCatalogoCuacService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RevalidadorCatalogoCuacService.name);
  private revalidando = false;
  private ultimoIntentoEn = 0;
  private vueloEnCurso: Promise<void> | null = null;
  private temporizadorIntervalo: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly clienteCarreras: ClienteCarrerasCuacService,
    private readonly persistencia: CatalogoCuacPersistenciaService,
  ) {}

  onModuleInit(): void {
    if (!this.syncHabilitada()) {
      this.logger.log('Revalidación CUAC deshabilitada (CARRERAS_SYNC_HABILITADO o entorno test).');
      return;
    }
    this.dispararRevalidacionEnSegundoPlano();
    this.temporizadorIntervalo = setInterval(() => {
      this.dispararRevalidacionEnSegundoPlano();
    }, INTERVALO_REVALIDACION_CUAC_MS);
  }

  onModuleDestroy(): void {
    if (this.temporizadorIntervalo) {
      clearInterval(this.temporizadorIntervalo);
      this.temporizadorIntervalo = null;
    }
  }

  estaRevalidando(): boolean {
    return this.revalidando;
  }

  /** No bloquea: un solo vuelo; errores nunca salen como unhandled rejection. */
  dispararRevalidacionEnSegundoPlano(): void {
    if (!this.syncHabilitada()) return;
    void this.revalidarSiObsoleto().catch((error: unknown) => {
      this.logger.warn(
        `Revalidación CUAC en segundo plano terminó con error no controlado (${mensajeError(error)}).`,
      );
    });
  }

  async revalidarSiObsoleto(forzar = false): Promise<void> {
    if (!this.syncHabilitada()) return;
    if (this.vueloEnCurso) return this.vueloEnCurso;

    this.vueloEnCurso = this.ejecutarRevalidacion(forzar).finally(() => {
      this.vueloEnCurso = null;
    });
    return this.vueloEnCurso;
  }

  private async ejecutarRevalidacion(forzar: boolean): Promise<void> {
    const ahora = Date.now();
    if (!forzar && ahora - this.ultimoIntentoEn < 5_000) return;

    let obsoleto = forzar;
    if (!forzar) {
      try {
        obsoleto = await this.persistencia.estaObsoleto();
      } catch (error) {
        this.logger.warn(
          `No se pudo comprobar obsolescencia del catálogo CUAC (${mensajeError(error)}); se omite la revalidación.`,
        );
        return;
      }
    }

    if (!obsoleto) return;

    this.revalidando = true;
    this.ultimoIntentoEn = ahora;

    try {
      const respuesta = await this.clienteCarreras.fetchCatalogoRemoto();
      const resultado = await this.persistencia.aplicarRespuestaApi(respuesta);
      this.logger.log(
        `Catálogo CUAC revalidado: ${resultado.importados} nuevos, ${resultado.actualizados} actualizados.`,
      );
    } catch (error) {
      this.logger.warn(
        `Revalidación CUAC en segundo plano falló (${mensajeError(error)}). Se conserva la copia en BD.`,
      );
    } finally {
      this.revalidando = false;
    }
  }

  intervaloMs(): number {
    return INTERVALO_REVALIDACION_CUAC_MS;
  }

  private syncHabilitada(): boolean {
    return esSincronizacionCuacHabilitada(this.config);
  }
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
