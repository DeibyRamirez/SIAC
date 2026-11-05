import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogoCuacPersistenciaService, INTERVALO_REVALIDACION_CUAC_MS } from './catalogo-cuac-persistencia.service';
import { ClienteCarrerasCuacService } from './cliente-carreras-cuac.service';
import { esSincronizacionCuacHabilitada } from './config-catalogo-cuac';

@Injectable()
export class RevalidadorCatalogoCuacService implements OnModuleInit {
  private readonly logger = new Logger(RevalidadorCatalogoCuacService.name);
  private revalidando = false;
  private ultimoIntentoEn = 0;

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
  }

  estaRevalidando(): boolean {
    return this.revalidando;
  }

  /** No bloquea: dispara fetch + persistencia si el catálogo en BD está obsoleto. */
  dispararRevalidacionEnSegundoPlano(): void {
    if (!this.syncHabilitada()) return;
    void this.revalidarSiObsoleto();
  }

  async revalidarSiObsoleto(forzar = false): Promise<void> {
    if (!this.syncHabilitada()) return;
    if (this.revalidando) return;

    const ahora = Date.now();
    if (!forzar && ahora - this.ultimoIntentoEn < 5_000) return;

    const obsoleto = forzar || (await this.persistencia.estaObsoleto());
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
        `Revalidación CUAC en segundo plano falló (${(error as Error).message}). Se conserva la copia en BD.`,
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
