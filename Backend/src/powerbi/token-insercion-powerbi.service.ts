import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.module';
import { ActualizarInsercionPowerBiDto } from './dto/actualizar-insercion-powerbi.dto';

export const CODIGO_POWERBI_NO_DISPONIBLE = 'POWERBI_NO_DISPONIBLE';
export const CODIGO_POWERBI_CONFIGURACION_INCOMPLETA = 'POWERBI_CONFIGURACION_INCOMPLETA';
export const CODIGO_POWERBI_DESHABILITADO = 'POWERBI_DESHABILITADO';

/** El token de inserción de Power BI no puede durar más de una hora. */
const DURACION_MAXIMA_MS = 60 * 60 * 1000;
const DURACION_MAXIMA_MIN = 60;
/** Se reutiliza la caché solo mientras queden estrictamente más de cinco minutos. */
const MARGEN_CACHE_MS = 5 * 60 * 1000;
const TIEMPO_ESPERA_DEFECTO_MS = 10_000;
const ALCANCE_AZURE = 'https://analysis.windows.net/powerbi/api/.default';
const UUID =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

export interface ConfiguracionInsercionPowerBi {
  habilitado: boolean;
  workspaceId: string | null;
  reportId: string | null;
  /** Verdadero solo si POWERBI_CLIENT_SECRET tiene valor. Nunca se devuelve el secreto. */
  secretoConfigurado: boolean;
  configuracionCompleta: boolean;
  /** El informe embebido solo se activa con el interruptor encendido y la configuración completa. */
  activo: boolean;
  /** Nombres de variables o campos que faltan. Sin valores. */
  faltantes: string[];
}

export interface TokenInsercionPowerBi {
  token: string;
  embedUrl: string;
  reportId: string;
  /** Instante ISO 8601 en que el token deja de ser válido para el cliente. */
  expiraEn: string;
}

export interface ResultadoPruebaConexionPowerBi {
  correcto: true;
  expiraEn: string;
}

interface CredencialesEntorno {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

interface FilaInsercion {
  habilitado: boolean;
  workspaceId: string | null;
  reportId: string | null;
}

interface EntradaCache {
  workspaceId: string;
  reportId: string;
  clientId: string;
  token: string;
  embedUrl: string;
  expiraEnMs: number;
}

interface ContextoEmision {
  fila: FilaInsercion;
  credenciales: CredencialesEntorno;
  workspaceId: string;
  reportId: string;
}

type ClienteHttp = (entrada: string, init?: RequestInit) => Promise<Response>;

function esUuid(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && UUID.test(valor.trim());
}

function cuerpo(codigo: string, message: string): { message: string; codigo: string } {
  return { message, codigo };
}

/**
 * Token de inserción (App Owns Data). El secreto de la entidad de servicio no sale del
 * proceso: la caché guarda el token de inserción en memoria y el cliente solo recibe
 * ese token, la URL y la fecha de vencimiento.
 */
@Injectable()
export class TokenInsercionPowerBiService {
  private readonly logger = new Logger(TokenInsercionPowerBiService.name);
  private cache: EntradaCache | null = null;
  private generacion = 0;
  private vuelo: Promise<TokenInsercionPowerBi> | null = null;
  private vueloGeneracion = 0;
  private solicitar: ClienteHttp = (entrada, init) => fetch(entrada, init);
  private ahora: () => number = () => Date.now();
  private tiempoEsperaMs = TIEMPO_ESPERA_DEFECTO_MS;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Solo pruebas: reloj, cliente HTTP y tiempo de espera. No se usa en producción. */
  usarDependenciasPrueba(opciones: {
    solicitar?: ClienteHttp;
    ahora?: () => number;
    tiempoEsperaMs?: number;
  }): void {
    if (opciones.solicitar) this.solicitar = opciones.solicitar;
    if (opciones.ahora) this.ahora = opciones.ahora;
    if (opciones.tiempoEsperaMs !== undefined) this.tiempoEsperaMs = opciones.tiempoEsperaMs;
  }

  async obtenerConfiguracion(): Promise<ConfiguracionInsercionPowerBi> {
    const fila = await this.leerFila();
    return this.vistaPublica(fila, this.credencialesEntorno());
  }

  async actualizar(
    dto: ActualizarInsercionPowerBiDto,
    usuarioId?: string,
  ): Promise<ConfiguracionInsercionPowerBi> {
    const anterior = await this.leerFila();
    const workspaceId = this.normalizarId(dto.workspaceId, anterior.workspaceId, 'área de trabajo');
    const reportId = this.normalizarId(dto.reportId, anterior.reportId, 'informe');
    const habilitado = dto.habilitado === undefined ? anterior.habilitado : dto.habilitado;
    const siguiente: FilaInsercion = { habilitado, workspaceId, reportId };

    await this.prisma.configuracionSIAC.upsert({
      where: { id: 'global' },
      update: {
        powerbiEmbedHabilitado: habilitado,
        powerbiWorkspaceId: workspaceId,
        powerbiReportId: reportId,
      },
      create: {
        id: 'global',
        powerbiEmbedHabilitado: habilitado,
        powerbiWorkspaceId: workspaceId,
        powerbiReportId: reportId,
      },
    });
    this.invalidarCache();
    this.auditar(anterior, siguiente, usuarioId);
    return this.vistaPublica(siguiente, this.credencialesEntorno());
  }

  async obtenerTokenInsercion(): Promise<TokenInsercionPowerBi> {
    const contexto = await this.prepararEmision({ exigirHabilitado: true });
    return this.tokenConCache(contexto, true);
  }

  /**
   * Comprueba Azure y Power BI sin exigir el interruptor. No devuelve el token:
   * el panel solo necesita saber que la conexión respondió.
   */
  async probarConexion(): Promise<ResultadoPruebaConexionPowerBi> {
    const contexto = await this.prepararEmision({ exigirHabilitado: false });
    const token = await this.tokenConCache(contexto, false);
    return { correcto: true, expiraEn: token.expiraEn };
  }

  private async tokenConCache(
    contexto: ContextoEmision,
    usarCache: boolean,
  ): Promise<TokenInsercionPowerBi> {
    if (usarCache) {
      const cacheado = this.leerCache(contexto);
      if (cacheado) return cacheado;
    }
    if (this.vuelo && this.vueloGeneracion === this.generacion) {
      return this.vuelo;
    }
    const generacion = this.generacion;
    this.vueloGeneracion = generacion;
    const vuelo = this.emitir(contexto, generacion).finally(() => {
      if (this.vuelo === vuelo) this.vuelo = null;
    });
    this.vuelo = vuelo;
    return vuelo;
  }

  private leerCache(contexto: ContextoEmision): TokenInsercionPowerBi | null {
    const entrada = this.cache;
    if (!entrada) return null;
    const mismaConfig =
      entrada.workspaceId === contexto.workspaceId &&
      entrada.reportId === contexto.reportId &&
      entrada.clientId === contexto.credenciales.clientId;
    if (!mismaConfig) return null;
    if (entrada.expiraEnMs - this.ahora() <= MARGEN_CACHE_MS) return null;
    return this.respuestaDesdeCache(entrada);
  }

  private async emitir(
    contexto: ContextoEmision,
    generacion: number,
  ): Promise<TokenInsercionPowerBi> {
    const accesoAzure = await this.pedirTokenAzure(contexto.credenciales);
    const generado = await this.pedirTokenInforme(contexto, accesoAzure);
    const expiraEnMs = this.limitarVencimiento(generado.expiration);
    const embedUrl = this.urlInsercion(contexto.reportId, contexto.workspaceId);
    const respuesta: TokenInsercionPowerBi = {
      token: generado.token,
      embedUrl,
      reportId: contexto.reportId,
      expiraEn: new Date(expiraEnMs).toISOString(),
    };
    if (generacion === this.generacion) {
      this.cache = {
        workspaceId: contexto.workspaceId,
        reportId: contexto.reportId,
        clientId: contexto.credenciales.clientId,
        token: respuesta.token,
        embedUrl,
        expiraEnMs,
      };
    }
    return respuesta;
  }

  private async pedirTokenAzure(credenciales: CredencialesEntorno): Promise<string> {
    const url = `https://login.microsoftonline.com/${credenciales.tenantId}/oauth2/v2.0/token`;
    const cuerpoFormulario = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credenciales.clientId,
      client_secret: credenciales.clientSecret,
      scope: ALCANCE_AZURE,
    });
    const respuesta = await this.solicitarConTope(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpoFormulario,
    });
    if (!respuesta.ok) {
      await this.descartarCuerpo(respuesta);
      this.logger.warn(`Azure AD rechazó la entidad de servicio (HTTP ${respuesta.status}).`);
      throw this.noDisponible();
    }
    const datos = (await respuesta.json().catch(() => null)) as { access_token?: unknown } | null;
    if (!datos || typeof datos.access_token !== 'string' || datos.access_token.length === 0) {
      this.logger.warn('Azure AD respondió sin token de acceso.');
      throw this.noDisponible();
    }
    return datos.access_token;
  }

  private async pedirTokenInforme(
    contexto: ContextoEmision,
    accesoAzure: string,
  ): Promise<{ token: string; expiration?: string }> {
    const url =
      `https://api.powerbi.com/v1.0/myorg/groups/${contexto.workspaceId}` +
      `/reports/${contexto.reportId}/GenerateToken`;
    const respuesta = await this.solicitarConTope(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accesoAzure}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessLevel: 'View',
        lifetimeInMinutes: DURACION_MAXIMA_MIN,
      }),
    });
    if (!respuesta.ok) {
      await this.descartarCuerpo(respuesta);
      this.logger.warn(`Power BI rechazó GenerateToken (HTTP ${respuesta.status}).`);
      throw this.noDisponible();
    }
    const datos = (await respuesta.json().catch(() => null)) as {
      token?: unknown;
      expiration?: unknown;
    } | null;
    if (!datos || typeof datos.token !== 'string' || datos.token.length === 0) {
      this.logger.warn('Power BI respondió sin token de inserción.');
      throw this.noDisponible();
    }
    return {
      token: datos.token,
      expiration: typeof datos.expiration === 'string' ? datos.expiration : undefined,
    };
  }

  private async solicitarConTope(url: string, init: RequestInit): Promise<Response> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), this.tiempoEsperaMs);
    try {
      return await this.solicitar(url, { ...init, signal: controlador.signal });
    } catch (error) {
      const cancelado =
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError');
      this.logger.warn(
        cancelado
          ? 'La llamada a Power BI superó el tiempo de espera.'
          : 'No se pudo contactar a Power BI.',
      );
      throw this.noDisponible();
    } finally {
      clearTimeout(temporizador);
    }
  }

  private async descartarCuerpo(respuesta: Response): Promise<void> {
    await respuesta.text().catch(() => undefined);
  }

  private limitarVencimiento(expiration: string | undefined): number {
    const tope = this.ahora() + DURACION_MAXIMA_MS;
    const informado = expiration ? Date.parse(expiration) : Number.NaN;
    if (!Number.isFinite(informado)) return tope;
    return Math.min(informado, tope);
  }

  private urlInsercion(reportId: string, workspaceId: string): string {
    const parametros = new URLSearchParams({ reportId, groupId: workspaceId });
    return `https://app.powerbi.com/reportEmbed?${parametros.toString()}`;
  }

  private respuestaDesdeCache(entrada: EntradaCache): TokenInsercionPowerBi {
    return {
      token: entrada.token,
      embedUrl: entrada.embedUrl,
      reportId: entrada.reportId,
      expiraEn: new Date(entrada.expiraEnMs).toISOString(),
    };
  }

  private async prepararEmision(opciones: { exigirHabilitado: boolean }): Promise<ContextoEmision> {
    const fila = await this.leerFila();
    const credenciales = this.credencialesEntorno();
    const vista = this.vistaPublica(fila, credenciales);
    if (opciones.exigirHabilitado && !fila.habilitado) {
      throw new ForbiddenException(
        cuerpo(CODIGO_POWERBI_DESHABILITADO, 'La inserción de Power BI está apagada.'),
      );
    }
    const workspaceId = fila.workspaceId?.trim() ?? '';
    const reportId = fila.reportId?.trim() ?? '';
    if (!vista.configuracionCompleta || !esUuid(workspaceId) || !esUuid(reportId)) {
      throw new BadRequestException(
        cuerpo(CODIGO_POWERBI_CONFIGURACION_INCOMPLETA, 'Configuración incompleta'),
      );
    }
    if (!esUuid(credenciales.tenantId) || !esUuid(credenciales.clientId)) {
      throw new BadRequestException(
        cuerpo(CODIGO_POWERBI_CONFIGURACION_INCOMPLETA, 'Configuración incompleta'),
      );
    }
    return {
      fila,
      credenciales,
      workspaceId,
      reportId,
    };
  }

  private async leerFila(): Promise<FilaInsercion> {
    const fila = await this.prisma.configuracionSIAC.findUnique({ where: { id: 'global' } });
    return {
      habilitado: fila?.powerbiEmbedHabilitado ?? false,
      workspaceId: fila?.powerbiWorkspaceId?.trim() || null,
      reportId: fila?.powerbiReportId?.trim() || null,
    };
  }

  private credencialesEntorno(): CredencialesEntorno {
    return {
      tenantId: this.config.get<string>('POWERBI_TENANT_ID')?.trim() ?? '',
      clientId: this.config.get<string>('POWERBI_CLIENT_ID')?.trim() ?? '',
      clientSecret: this.config.get<string>('POWERBI_CLIENT_SECRET')?.trim() ?? '',
    };
  }

  private vistaPublica(
    fila: FilaInsercion,
    credenciales: CredencialesEntorno,
  ): ConfiguracionInsercionPowerBi {
    const faltantes: string[] = [];
    if (!esUuid(credenciales.tenantId)) faltantes.push('POWERBI_TENANT_ID');
    if (!esUuid(credenciales.clientId)) faltantes.push('POWERBI_CLIENT_ID');
    if (!credenciales.clientSecret) faltantes.push('POWERBI_CLIENT_SECRET');
    if (!esUuid(fila.workspaceId)) faltantes.push('workspaceId');
    if (!esUuid(fila.reportId)) faltantes.push('reportId');
    const configuracionCompleta = faltantes.length === 0;
    const workspaceId = fila.workspaceId?.trim() ?? '';
    const reportId = fila.reportId?.trim() ?? '';
    return {
      habilitado: fila.habilitado,
      workspaceId: esUuid(workspaceId) ? workspaceId : null,
      reportId: esUuid(reportId) ? reportId : null,
      secretoConfigurado: credenciales.clientSecret.length > 0,
      configuracionCompleta,
      activo: fila.habilitado && configuracionCompleta,
      faltantes,
    };
  }

  private normalizarId(
    recibido: string | undefined,
    anterior: string | null,
    etiqueta: string,
  ): string | null {
    if (recibido === undefined) return anterior;
    const texto = recibido.trim();
    if (texto.length === 0) return null;
    if (!esUuid(texto)) {
      throw new BadRequestException(`El id del ${etiqueta} debe ser un UUID.`);
    }
    return texto;
  }

  private invalidarCache(): void {
    this.cache = null;
    this.generacion += 1;
  }

  private auditar(anterior: FilaInsercion, siguiente: FilaInsercion, usuarioId?: string): void {
    const cambio =
      anterior.habilitado !== siguiente.habilitado ||
      anterior.workspaceId !== siguiente.workspaceId ||
      anterior.reportId !== siguiente.reportId;
    if (!cambio) return;
    this.logger.log(
      `Auditoría Power BI: el usuario ${usuarioId ?? 'desconocido'} actualizó la inserción. ` +
        `habilitado ${anterior.habilitado} → ${siguiente.habilitado}; ` +
        `workspaceId ${anterior.workspaceId ?? 'vacío'} → ${siguiente.workspaceId ?? 'vacío'}; ` +
        `reportId ${anterior.reportId ?? 'vacío'} → ${siguiente.reportId ?? 'vacío'}.`,
    );
  }

  private noDisponible(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      cuerpo(CODIGO_POWERBI_NO_DISPONIBLE, 'Power BI no está disponible.'),
    );
  }
}
