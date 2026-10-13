import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { normalizarUrlPublicaPowerBi } from '../common/config/configuracion.env';
import { PowerBiService } from './powerbi.service';

const URL_PRUEBA = 'https://app.powerbi.com/view?r=urlDePrueba123';

function crearServicio(valores: Record<string, string | undefined>) {
  const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService;
  return new PowerBiService(config);
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
    expect(respuesta.mensaje).toMatch(/POWERBI_URL_PUBLICA_ESTUDIANTES/);
  });

  it('usa la URL pública configurada en el entorno', async () => {
    const respuesta = await crearServicio({
      POWERBI_URL_PUBLICA_ESTUDIANTES: URL_PRUEBA,
    }).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe(URL_PRUEBA);
    expect(respuesta.fallback).toBe(true);
  });

  it('ignora una URL pública inválida y cae al respaldo', async () => {
    const respuesta = await crearServicio({
      POWERBI_URL_PUBLICA_ESTUDIANTES: 'https://ejemplo.com/informe',
    }).obtenerEmbedToken('estudiantes');
    expect(respuesta.embedUrl).toBe('');
    expect(respuesta.fallback).toBe(true);
  });

  it('rechaza categorías sin informe configurado', async () => {
    await expect(crearServicio({}).obtenerEmbedToken('bienestar')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
