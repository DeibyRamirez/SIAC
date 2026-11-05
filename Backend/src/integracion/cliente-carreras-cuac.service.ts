import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RespuestaCarrerasExternasDto } from './mapear-carrera-externa';

export const URL_CARRERAS_CUAC_DEFECTO = 'https://api-programas-cuac.vercel.app/carreras';
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8_000;

export interface ResultadoCatalogoCarreras {
  respuesta: RespuestaCarrerasExternasDto | null;
  desdeCache: boolean;
  degradado: boolean;
}

@Injectable()
export class ClienteCarrerasCuacService {
  private readonly logger = new Logger(ClienteCarrerasCuacService.name);
  private cache: { respuesta: RespuestaCarrerasExternasDto | null; expiraEn: number } = {
    respuesta: null,
    expiraEn: 0,
  };

  constructor(private readonly config: ConfigService) {}

  urlCatalogo(): string {
    return this.config.get<string>('CARRERAS_API_URL')?.trim() || URL_CARRERAS_CUAC_DEFECTO;
  }

  baseImagenes(): string {
    return (
      this.config.get<string>('CARRERAS_IMAGENES_BASE_URL')?.trim() ||
      this.config.get<string>('FRONTEND_URL')?.trim() ||
      'http://localhost:3000'
    );
  }

  /** Catálogo en memoria (TTL 10 min). Si la API falla, devuelve la última copia en caché o null. */
  async obtenerCatalogo(opciones?: { forzarRed?: boolean }): Promise<ResultadoCatalogoCarreras> {
    const ahora = Date.now();
    if (!opciones?.forzarRed && this.cache.respuesta && ahora < this.cache.expiraEn) {
      return { respuesta: this.cache.respuesta, desdeCache: true, degradado: false };
    }

    try {
      const respuesta = await this.fetchCatalogoRemoto();
      this.cache = { respuesta, expiraEn: ahora + TTL_MS };
      return { respuesta, desdeCache: false, degradado: false };
    } catch (error) {
      this.logger.warn(
        `Catálogo CUAC no disponible (${(error as Error).message}). Se usa caché previa o datos locales SIAC.`,
      );
      if (this.cache.respuesta) {
        return { respuesta: this.cache.respuesta, desdeCache: true, degradado: true };
      }
      return { respuesta: null, desdeCache: false, degradado: true };
    }
  }

  invalidarCache(): void {
    this.cache = { respuesta: null, expiraEn: 0 };
  }

  async fetchCatalogoRemoto(): Promise<RespuestaCarrerasExternasDto> {
    const url = this.urlCatalogo();
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    try {
      const respuesta = await fetch(url, { signal: controlador.signal });
      if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
      }
      const datos = (await respuesta.json()) as RespuestaCarrerasExternasDto;
      if (!datos.success || !Array.isArray(datos.carreras)) {
        throw new Error('Respuesta inválida de la API de carreras.');
      }
      return datos;
    } finally {
      clearTimeout(temporizador);
    }
  }
}
