import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsultaPanelProgramasDto } from '../programas/dto/consulta-panel-programas.dto';
import { UsuarioAlcance } from '../common/alcance/servicio-alcance-programa';

export interface FiltrosCatalogoCuacDto {
  niveles: string[];
  facultades: string[];
  modalidades: string[];
}

interface EntradaCache<T> {
  expiraEn: number;
  valor: T;
}

/** Caché en memoria de respuestas GET programas/panel, GET programas y filtros CUAC. */
@Injectable()
export class CacheConsultasProgramasService {
  private readonly ttlMs: number;
  private panel = new Map<string, EntradaCache<unknown>>();
  private listado = new Map<string, EntradaCache<unknown>>();
  private filtrosCatalogo: EntradaCache<FiltrosCatalogoCuacDto> | null = null;

  constructor(config: ConfigService) {
    const crudo = Number(config.get<string>('PROGRAMAS_RESPUESTA_CACHE_TTL_SEG') ?? 45);
    const segundos = Number.isFinite(crudo) && crudo > 0 ? crudo : 45;
    const acotado = Math.min(60, Math.max(30, segundos));
    this.ttlMs = acotado * 1000;
  }

  ttlSegundos(): number {
    return this.ttlMs / 1000;
  }

  leerPanel<T = unknown>(clave: string): T | null {
    return this.leer(this.panel, clave) as T | null;
  }

  guardarPanel(clave: string, valor: unknown): void {
    this.guardar(this.panel, clave, valor);
  }

  clavePanel(query: ConsultaPanelProgramasDto, usuario: UsuarioAlcance): string {
    const q = { ...query };
    return JSON.stringify({ u: usuario.id, r: usuario.rol, q });
  }

  leerListado(clave: string): unknown | null {
    return this.leer(this.listado, clave);
  }

  guardarListado(clave: string, valor: unknown): void {
    this.guardar(this.listado, clave, valor);
  }

  claveListado(usuario: UsuarioAlcance): string {
    return JSON.stringify({ u: usuario.id, r: usuario.rol });
  }

  leerFiltrosCatalogo(): FiltrosCatalogoCuacDto | null {
    if (!this.filtrosCatalogo || Date.now() >= this.filtrosCatalogo.expiraEn) {
      this.filtrosCatalogo = null;
      return null;
    }
    return this.filtrosCatalogo.valor;
  }

  guardarFiltrosCatalogo(valor: FiltrosCatalogoCuacDto): void {
    this.filtrosCatalogo = { valor, expiraEn: Date.now() + this.ttlMs };
  }

  /** Tras sync CUAC o mutación de programas. */
  invalidarTodo(): void {
    this.panel.clear();
    this.listado.clear();
    this.filtrosCatalogo = null;
  }

  private leer<T>(mapa: Map<string, EntradaCache<T>>, clave: string): T | null {
    const entrada = mapa.get(clave);
    if (!entrada || Date.now() >= entrada.expiraEn) {
      mapa.delete(clave);
      return null;
    }
    return entrada.valor;
  }

  private guardar<T>(mapa: Map<string, EntradaCache<T>>, clave: string, valor: T): void {
    mapa.set(clave, { valor, expiraEn: Date.now() + this.ttlMs });
  }
}
