import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { normalizarUrlPublicaPowerBi } from '../common/config/configuracion.env';
import { PowerBiService } from './powerbi.service';

const URL_PRUEBA = 'https://app.powerbi.com/view?r=urlDePrueba123';

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
  it('acepta una URL de Publicar en la web', () => {
    expect(normalizarUrlPublicaPowerBi(`  ${URL_PRUEBA} `)).toBe(URL_PRUEBA);
  });

  it.each([
    undefined,
    '',
    'http://app.powerbi.com/view?r=abc',
    'https://app.powerbi.com/view?r=',
    'https://app.powerbi.com/reportEmbed?reportId=abc',
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

  it('usa la URL pública almacenada en ConfiguracionInformePowerBi', async () => {
    const respuesta = await crearServicio({}, URL_PRUEBA).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe(URL_PRUEBA);
    expect(respuesta.fallback).toBe(true);
  });

  it('ignora una URL pública inválida en BD y cae al respaldo', async () => {
    const respuesta = await crearServicio(
      {},
      'https://ejemplo.com/informe',
    ).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe('');
    expect(respuesta.fallback).toBe(true);
  });

  it('sin POWERBI_REPORT_ID_ESTUDIANTES no inventa un ID (no hay valor por defecto)', async () => {
    const respuesta = await crearServicio({}, URL_PRUEBA).obtenerEmbedToken('estudiantes');
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

  it('con Azure pero sin ID del informe cae a la vista pública o al respaldo', async () => {
    const conVista = await crearServicio(
      { POWERBI_CLIENT_ID: 'cliente-prueba' },
      URL_PRUEBA,
    ).obtenerEmbedToken('estudiantes');
    expect(conVista.embedUrl).toBe(URL_PRUEBA);
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
