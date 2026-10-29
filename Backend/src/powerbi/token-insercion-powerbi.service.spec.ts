import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ActualizarInsercionPowerBiDto } from './dto/actualizar-insercion-powerbi.dto';
import {
  CODIGO_POWERBI_CONFIGURACION_INCOMPLETA,
  CODIGO_POWERBI_DESHABILITADO,
  CODIGO_POWERBI_NO_DISPONIBLE,
  TokenInsercionPowerBiService,
} from './token-insercion-powerbi.service';

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLIENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const WORKSPACE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REPORT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SECRETO = 'SECRETO-QUE-NO-DEBE-APARECER';
const TOKEN_AZURE = 'TOKEN-AZURE-QUE-NO-DEBE-APARECER';
const TOKEN_EMBED = 'TOKEN-EMBED-QUE-NO-DEBE-APARECER';
const AHORA = 1_700_000_000_000;

function fila(parcial: Record<string, unknown> = {}) {
  return {
    id: 'global',
    powerbiEmbedHabilitado: true,
    powerbiWorkspaceId: WORKSPACE,
    powerbiReportId: REPORT,
    ...parcial,
  };
}

function respuestaJson(estado: number, datos: unknown): Response {
  return {
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: async () => datos,
    text: async () => (typeof datos === 'string' ? datos : JSON.stringify(datos)),
  } as Response;
}

describe('TokenInsercionPowerBiService', () => {
  let valores: Record<string, string | undefined>;
  let prisma: { configuracionSIAC: { findUnique: jest.Mock; upsert: jest.Mock } };
  let solicitudes: Array<{ url: string; init?: RequestInit }>;
  let reloj: number;
  let servicio: TokenInsercionPowerBiService;
  let registros: string[];

  beforeEach(() => {
    valores = {
      POWERBI_TENANT_ID: TENANT,
      POWERBI_CLIENT_ID: CLIENT,
      POWERBI_CLIENT_SECRET: SECRETO,
    };
    prisma = {
      configuracionSIAC: {
        findUnique: jest.fn().mockResolvedValue(fila()),
        upsert: jest.fn().mockResolvedValue(fila()),
      },
    };
    solicitudes = [];
    reloj = AHORA;
    registros = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation((mensaje: unknown) => {
      registros.push(String(mensaje));
    });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation((mensaje: unknown) => {
      registros.push(String(mensaje));
    });
    jest.spyOn(Logger.prototype, 'error').mockImplementation((mensaje: unknown) => {
      registros.push(String(mensaje));
    });

    const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService;
    servicio = new TokenInsercionPowerBiService(config, prisma as never);
    servicio.usarDependenciasPrueba({
      ahora: () => reloj,
      solicitar: async (url, init) => {
        solicitudes.push({ url, init });
        if (url.includes('login.microsoftonline.com')) {
          return respuestaJson(200, { access_token: TOKEN_AZURE, expires_in: 3600 });
        }
        return respuestaJson(200, {
          token: TOKEN_EMBED,
          expiration: new Date(reloj + 60 * 60 * 1000).toISOString(),
        });
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function textoRegistros(): string {
    return registros.join('\n');
  }

  it('con el interruptor apagado no llama a Azure y conserva el código de apagado', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue(fila({ powerbiEmbedHabilitado: false }));
    await expect(servicio.obtenerTokenInsercion()).rejects.toMatchObject({
      response: { codigo: CODIGO_POWERBI_DESHABILITADO },
    });
    expect(solicitudes).toHaveLength(0);
  });

  it('apagado, la configuración pública no marca el informe como activo', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue(fila({ powerbiEmbedHabilitado: false }));
    const vista = await servicio.obtenerConfiguracion();
    expect(vista.habilitado).toBe(false);
    expect(vista.activo).toBe(false);
    expect(vista.configuracionCompleta).toBe(true);
    expect(vista.secretoConfigurado).toBe(true);
    expect(JSON.stringify(vista)).not.toContain(SECRETO);
  });

  it('encendido sin credenciales completas no llama a Azure y responde configuración incompleta', async () => {
    valores.POWERBI_CLIENT_SECRET = '';
    await expect(servicio.obtenerTokenInsercion()).rejects.toMatchObject({
      response: {
        codigo: CODIGO_POWERBI_CONFIGURACION_INCOMPLETA,
        message: 'Configuración incompleta',
      },
    });
    expect(solicitudes).toHaveLength(0);
    const vista = await servicio.obtenerConfiguracion();
    expect(vista.activo).toBe(false);
    expect(vista.secretoConfigurado).toBe(false);
    expect(vista.faltantes).toContain('POWERBI_CLIENT_SECRET');
  });

  it('pide un token de solo lectura de máximo 60 minutos y no escribe secretos en el log', async () => {
    const token = await servicio.obtenerTokenInsercion();
    expect(token).toEqual({
      token: TOKEN_EMBED,
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&groupId=${WORKSPACE}`,
      reportId: REPORT,
      expiraEn: new Date(AHORA + 60 * 60 * 1000).toISOString(),
    });
    expect(solicitudes).toHaveLength(2);

    const cuerpoAzure = solicitudes[0].init?.body as URLSearchParams;
    expect(cuerpoAzure.get('grant_type')).toBe('client_credentials');
    expect(cuerpoAzure.get('client_id')).toBe(CLIENT);
    expect(cuerpoAzure.get('client_secret')).toBe(SECRETO);
    expect(cuerpoAzure.get('scope')).toBe('https://analysis.windows.net/powerbi/api/.default');

    const cuerpoInforme = JSON.parse(String(solicitudes[1].init?.body));
    expect(cuerpoInforme).toEqual({ accessLevel: 'View', lifetimeInMinutes: 60 });
    expect(solicitudes[1].init?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN_AZURE}`,
    });

    const texto = textoRegistros();
    expect(texto).not.toContain(SECRETO);
    expect(texto).not.toContain(TOKEN_AZURE);
    expect(texto).not.toContain(TOKEN_EMBED);
  });

  it('reutiliza la caché mientras queden más de 5 minutos y la renueva al llegar al margen', async () => {
    await servicio.obtenerTokenInsercion();
    reloj = AHORA + 54 * 60 * 1000;
    await servicio.obtenerTokenInsercion();
    expect(solicitudes).toHaveLength(2);

    reloj = AHORA + 55 * 60 * 1000;
    await servicio.obtenerTokenInsercion();
    expect(solicitudes).toHaveLength(4);
  });

  it('recorta un vencimiento de Power BI que supere los 60 minutos', async () => {
    servicio.usarDependenciasPrueba({
      ahora: () => reloj,
      solicitar: async (url) => {
        solicitudes.push({ url });
        if (url.includes('login.microsoftonline.com')) {
          return respuestaJson(200, { access_token: TOKEN_AZURE });
        }
        return respuestaJson(200, {
          token: TOKEN_EMBED,
          expiration: new Date(AHORA + 3 * 60 * 60 * 1000).toISOString(),
        });
      },
    });
    const token = await servicio.obtenerTokenInsercion();
    expect(token.expiraEn).toBe(new Date(AHORA + 60 * 60 * 1000).toISOString());
  });

  it('si Azure o Power BI fallan responde 503 sin volcar el cuerpo al log', async () => {
    servicio.usarDependenciasPrueba({
      ahora: () => reloj,
      solicitar: async (url) => {
        if (url.includes('login.microsoftonline.com')) {
          return respuestaJson(401, { error: 'invalid_client', error_description: SECRETO });
        }
        return respuestaJson(200, { token: TOKEN_EMBED });
      },
    });
    await expect(servicio.obtenerTokenInsercion()).rejects.toMatchObject({
      response: { codigo: CODIGO_POWERBI_NO_DISPONIBLE, message: 'Power BI no está disponible.' },
    });
    expect(textoRegistros()).not.toContain(SECRETO);
    expect(textoRegistros()).toContain('HTTP 401');
  });

  it('si la llamada supera el tiempo de espera responde POWERBI_NO_DISPONIBLE', async () => {
    servicio.usarDependenciasPrueba({
      ahora: () => reloj,
      tiempoEsperaMs: 20,
      solicitar: (_url, init) =>
        new Promise((_resolve, reject) => {
          const senal = init?.signal;
          const abortar = () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          };
          if (senal?.aborted) abortar();
          senal?.addEventListener('abort', abortar);
        }),
    });
    await expect(servicio.obtenerTokenInsercion()).rejects.toMatchObject({
      response: { codigo: CODIGO_POWERBI_NO_DISPONIBLE },
    });
    expect(textoRegistros()).toContain('tiempo de espera');
    expect(textoRegistros()).not.toContain(SECRETO);
  });

  it('probar conexión no exige el interruptor, no devuelve el token y sí exige credenciales', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue(fila({ powerbiEmbedHabilitado: false }));
    const resultado = await servicio.probarConexion();
    expect(resultado).toEqual({
      correcto: true,
      expiraEn: new Date(AHORA + 60 * 60 * 1000).toISOString(),
    });
    expect(resultado).not.toHaveProperty('token');
    expect(solicitudes).toHaveLength(2);

    valores.POWERBI_TENANT_ID = 'no-es-uuid';
    await expect(servicio.probarConexion()).rejects.toMatchObject({
      response: { codigo: CODIGO_POWERBI_CONFIGURACION_INCOMPLETA },
    });
  });

  it('guardar el interruptor no pisa los umbrales y deja auditoría sin secretos', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue(
      fila({ powerbiEmbedHabilitado: false, powerbiWorkspaceId: null, powerbiReportId: null }),
    );
    const vista = await servicio.actualizar(
      { habilitado: true, workspaceId: WORKSPACE, reportId: REPORT },
      'usuario-admin-1',
    );
    expect(vista.habilitado).toBe(true);
    expect(vista.activo).toBe(true);
    expect(prisma.configuracionSIAC.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'global' },
        update: {
          powerbiEmbedHabilitado: true,
          powerbiWorkspaceId: WORKSPACE,
          powerbiReportId: REPORT,
        },
      }),
    );
    const actualizacion = prisma.configuracionSIAC.upsert.mock.calls[0][0].update;
    expect(actualizacion).not.toHaveProperty('mesesAvisoVigencia');
    expect(actualizacion).not.toHaveProperty('mesesRojoVigencia');
    expect(textoRegistros()).toContain('usuario-admin-1');
    expect(textoRegistros()).toContain('habilitado false → true');
    expect(textoRegistros()).not.toContain(SECRETO);
  });

  it('encender sin identificadores deja el interruptor guardado y el informe inactivo', async () => {
    prisma.configuracionSIAC.findUnique.mockResolvedValue(
      fila({ powerbiEmbedHabilitado: false, powerbiWorkspaceId: null, powerbiReportId: null }),
    );
    const vista = await servicio.actualizar({ habilitado: true }, 'usuario-admin-1');
    expect(vista.habilitado).toBe(true);
    expect(vista.activo).toBe(false);
    expect(vista.faltantes).toEqual(expect.arrayContaining(['workspaceId', 'reportId']));
  });

  it('una cadena vacía borra el identificador del informe', async () => {
    await servicio.actualizar({ reportId: '' }, 'usuario-admin-1');
    expect(prisma.configuracionSIAC.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ powerbiReportId: null }),
      }),
    );
  });
});

describe('ActualizarInsercionPowerBiDto', () => {
  async function erroresDe(datos: object): Promise<string[]> {
    const instancia = plainToInstance(ActualizarInsercionPowerBiDto, datos);
    const errores = await validate(instancia);
    return errores.map((error) => error.property);
  }

  it('acepta un UUID y una cadena vacía para borrar', async () => {
    await expect(erroresDe({ workspaceId: WORKSPACE, reportId: '' })).resolves.toEqual([]);
  });

  it('rechaza un identificador que no es UUID', async () => {
    await expect(erroresDe({ workspaceId: 'area-demo' })).resolves.toContain('workspaceId');
  });
});
