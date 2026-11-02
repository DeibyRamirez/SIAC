import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OpenAPIObject } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import {
  crearDocumentoOpenApi,
  exponerInterfazSwagger,
  serializarOpenApi,
} from './documento-openapi';

const RUTA_EXPORTADO = join(__dirname, '../../../docs/contrato-api/openapi.json');

/** Sustituye Prisma para generar el contrato sin abrir una conexión. */
function prismaSinConexion(): PrismaService {
  const modelo = new Proxy(
    {},
    {
      get: () => async () => null,
    },
  );
  return new Proxy(
    {},
    {
      get(_objetivo, propiedad) {
        if (propiedad === '$connect' || propiedad === '$disconnect') return async () => undefined;
        if (
          propiedad === '$queryRaw' ||
          propiedad === '$executeRaw' ||
          propiedad === '$queryRawUnsafe' ||
          propiedad === '$executeRawUnsafe'
        ) {
          return async () => 1;
        }
        if (propiedad === '$transaction') {
          return async (operaciones: unknown) =>
            Array.isArray(operaciones) ? operaciones.map(() => []) : [];
        }
        if (propiedad === 'tramiteSIAC') return { findMany: async () => [] };
        if (propiedad === 'configuracionSIAC') return { findUnique: async () => null };
        return modelo;
      },
    },
  ) as unknown as PrismaService;
}

function prepararEntornoContrato(): void {
  process.env.NODE_ENV = 'test';
  process.env.VIGENCIA_MODO_PRUEBA = 'false';
  process.env.CORREO_CANAL = 'ninguno';
  process.env.S3_USAR_ALMACEN_LOCAL = 'true';
  process.env.ALMACEN_LOCAL_RUTA = '/tmp/siac-openapi-almacen';
  if (!process.env.JWT_SECRETO) {
    process.env.JWT_SECRETO = 'solo-para-generar-el-contrato';
  }
}

describe('contrato OpenAPI', () => {
  it('no publica la interfaz Swagger en producción', () => {
    expect(exponerInterfazSwagger('production')).toBe(false);
    expect(exponerInterfazSwagger('development')).toBe(true);
    expect(exponerInterfazSwagger('test')).toBe(true);
    expect(exponerInterfazSwagger(undefined)).toBe(true);
  });

  it('el OpenAPI generado coincide con docs/contrato-api/openapi.json', async () => {
    prepararEntornoContrato();
    const { AppModule } = await import('../app.module');
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaSinConexion())
      .compile();

    const app = modulo.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const documento = crearDocumentoOpenApi(app);
    const texto = serializarOpenApi(documento);
    await app.close();

    if (process.env.ESCRIBIR_CONTRATO_OPENAPI === '1') {
      mkdirSync(join(RUTA_EXPORTADO, '..'), { recursive: true });
      writeFileSync(RUTA_EXPORTADO, texto);
    }

    const guardado = readFileSync(RUTA_EXPORTADO, 'utf8');
    expect(texto).toBe(guardado);
    assertarContrato(documento);
  }, 120000);
});

function assertarContrato(documento: OpenAPIObject): void {
  const rutas = Object.keys(documento.paths);
  expect(rutas.length).toBeGreaterThan(0);
  expect(rutas.every((ruta) => ruta.startsWith('/api/v1/'))).toBe(true);
  expect(rutas).toContain('/api/v1/salud');
  expect(rutas).toContain('/api/v1/auth/login');
  expect(rutas).toContain('/api/v1/powerbi/informes');

  const metodosHttp = new Set(['get', 'post', 'put', 'patch', 'delete']);
  for (const ruta of rutas) {
    const elemento = documento.paths[ruta] ?? {};
    for (const [metodo, operacion] of Object.entries(elemento)) {
      if (!metodosHttp.has(metodo) || !operacion || typeof operacion !== 'object') continue;
      const roles = (operacion as { 'x-siac-roles'?: unknown })['x-siac-roles'];
      expect(Array.isArray(roles) && roles.length > 0).toBe(true);
    }
  }

  const login = documento.paths['/api/v1/auth/login']?.post as { security?: unknown[] } | undefined;
  expect(login?.security ?? []).toEqual([]);
  const perfil = documento.paths['/api/v1/auth/perfil']?.get as { security?: unknown[] } | undefined;
  expect(perfil?.security).toEqual([{ jwt: [] }]);
}
