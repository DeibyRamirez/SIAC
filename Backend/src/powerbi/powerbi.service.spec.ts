import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { normalizarUrlPublicaPowerBi } from '../common/config/configuracion.env';
import { PowerBiService } from './powerbi.service';

const REPORT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const CTID = '0f1e2d3c-4b5a-6978-8a7b-6c5d4e3f2a1b';
const URL_REPORT_EMBED = `https://app.powerbi.com/reportEmbed?reportId=${REPORT}&autoAuth=true&ctid=${CTID}`;
const URL_VIEW = 'https://app.powerbi.com/view?r=urlDePrueba123';

function crearServicio(
  valores: Record<string, string | undefined>,
  urlPublicaEstudiantes?: string,
) {
  const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService;
  const prisma = {
    configuracionInformePowerBi: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { categoriaId: string } }) => {
        if (where.categoriaId === 'estudiantes' && urlPublicaEstudiantes) {
          return Promise.resolve({
            categoriaId: 'estudiantes',
            urlPublica: urlPublicaEstudiantes,
            activo: true,
            urlHash: 'hash-prueba',
            updatedAt: new Date(),
          });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
  };
  return new PowerBiService(config, prisma as never);
}

describe('normalizarUrlPublicaPowerBi', () => {
  it('acepta reportEmbed', () => {
    expect(normalizarUrlPublicaPowerBi(`  ${URL_REPORT_EMBED} `)).toBe(URL_REPORT_EMBED);
  });

  it.each([
    undefined,
    '',
    URL_VIEW,
    'http://app.powerbi.com/view?r=abc',
    'https://app.powerbi.com/view?r=',
    'https://app.powerbi.com/reportEmbed?reportId=abc',
    'https://app.powerbi.com:443/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'https://user@app.powerbi.com/reportEmbed?reportId=' + REPORT + '&ctid=' + CTID,
    'javascript:alert(1)',
    'https://ejemplo.com/view?r=abc',
  ])('rechaza %p devolviendo cadena vacía', (valor) => {
    expect(normalizarUrlPublicaPowerBi(valor)).toBe('');
  });
});

describe('PowerBiService · estudiantes', () => {
  it('sin POWERBI_URL_PUBLICA_ESTUDIANTES devuelve respaldo sin URL (no hay valor por defecto)', async () => {
    const respuesta = await crearServicio({}).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe('');
    expect(respuesta.fallback).toBe(true);
    expect(respuesta.mensaje).toMatch(/Informe público de Estudiantes no configurado/);
  });

  it('usa la URL reportEmbed almacenada en ConfiguracionInformePowerBi', async () => {
    const respuesta = await crearServicio({}, URL_REPORT_EMBED).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe(URL_REPORT_EMBED);
    expect(respuesta.fallback).toBe(true);
  });

  it('ignora una URL /view?r= en BD y cae al respaldo', async () => {
    const respuesta = await crearServicio({}, URL_VIEW).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe('');
    expect(respuesta.fallback).toBe(true);
  });

  it('ignora una URL inválida en BD y cae al respaldo', async () => {
    const respuesta = await crearServicio(
      {},
      'https://ejemplo.com/informe',
    ).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe('');
    expect(respuesta.fallback).toBe(true);
  });

  it('sin POWERBI_REPORT_ID_ESTUDIANTES no inventa un ID (no hay valor por defecto)', async () => {
    const respuesta = await crearServicio({}, URL_REPORT_EMBED).obtenerEmbedToken('estudiantes');
    expect(respuesta.reportId).toBe('');
  });

  it('usa el ID del informe configurado y arma la URL de embed con Azure', async () => {
    const respuesta = await crearServicio({
      POWERBI_CLIENT_ID: 'cliente-prueba',
      POWERBI_WORKSPACE_ID: 'workspace-prueba',
      POWERBI_REPORT_ID_ESTUDIANTES: ' informe-prueba ',
    }).obtenerEmbedToken('estudiantes');
    expect(respuesta.reportId).toBe('informe-prueba');
    expect(respuesta.embedUrl).toBe(
      'https://app.powerbi.com/reportEmbed?reportId=informe-prueba&groupId=workspace-prueba',
    );
    expect(respuesta.fallback).toBe(false);
  });

  it('con Azure pero sin ID del informe cae a reportEmbed en BD o al respaldo', async () => {
    const conVista = await crearServicio(
      { POWERBI_CLIENT_ID: 'cliente-prueba' },
      URL_REPORT_EMBED,
    ).obtenerEmbedToken('estudiantes');
    expect(conVista.embedUrl).toBe(URL_REPORT_EMBED);
    expect(conVista.fallback).toBe(true);

    const sinVista = await crearServicio({ POWERBI_CLIENT_ID: 'cliente-prueba' }).obtenerEmbedToken(
      'estudiantes',
    );
    expect(sinVista.embedUrl).toBe('');
    expect(sinVista.mensaje).toMatch(/POWERBI_REPORT_ID_ESTUDIANTES/);
  });

  it('rechaza categorías sin informe configurado', async () => {
    await expect(crearServicio({}).obtenerEmbedToken('bienestar')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('PowerBiService · guardar URL', () => {
  function servicioConUpsert() {
    const upsert = jest.fn().mockImplementation(({ create }: { create: { categoriaId: string; urlHash: string } }) =>
      Promise.resolve({
        categoriaId: create.categoriaId,
        urlHash: create.urlHash,
        activo: true,
        updatedAt: new Date('2026-11-04T00:00:00.000Z'),
      }),
    );
    const prisma = {
      configuracionInformePowerBi: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert,
      },
    };
    const config = { get: () => undefined } as unknown as ConfigService;
    return { servicio: new PowerBiService(config, prisma as never), upsert };
  }

  it('persiste reportEmbed y rechaza javascript y /view?r=', async () => {
    const { servicio, upsert } = servicioConUpsert();
    const meta = await servicio.guardarUrlPublica('estudiantes', URL_REPORT_EMBED, 'usuario-1');
    expect(meta.configurado).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { categoriaId: 'estudiantes' },
        create: expect.objectContaining({
          urlPublica: URL_REPORT_EMBED,
          actualizadoPorId: 'usuario-1',
        }),
      }),
    );
    await expect(
      servicio.guardarUrlPublica('estudiantes', 'javascript:alert(1)', 'usuario-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.guardarUrlPublica('estudiantes', URL_VIEW, 'usuario-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
