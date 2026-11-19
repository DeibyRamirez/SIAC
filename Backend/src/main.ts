import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FiltroExcepcionHttp } from './common/filters/http-exception.filter';
import { crearDocumentoOpenApi } from './openapi/documento-openapi';
import {
  crearMiddlewareBasicSwagger,
  resolverAccesoSwagger,
  RUTA_SWAGGER,
} from './openapi/acceso-swagger';
import {
  resolverOrigenesCors,
  resolverPuerto,
  validarEntornoProduccion,
} from './common/config/servidor';
import { advertirLimiteConexionesBaseDatos } from './common/config/advertir-pool-base-datos';
import { advertirRolAplicacionBaseDatos } from './common/config/advertir-rol-base-datos';
import { configurarConfianzaProxy } from './common/config/confianza-proxy';
import { PrismaService } from './prisma/prisma.module';

function registrarManejadoresErroresProceso(): void {
  process.on('unhandledRejection', (motivo: unknown) => {
    const detalle = motivo instanceof Error ? motivo.stack ?? motivo.message : String(motivo);
    console.error('[proceso] Promesa rechazada no capturada (unhandledRejection):', detalle);
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('[proceso] Excepción no capturada (uncaughtException):', error.stack ?? error.message);
    process.exit(1);
  });
}

registrarManejadoresErroresProceso();

async function bootstrap() {
  advertirLimiteConexionesBaseDatos();
  // En producción (Render) se detiene el arranque si falta configuración crítica.
  const { errores, advertencias } = validarEntornoProduccion();
  advertencias.forEach((mensaje) => console.warn(`[configuración] ${mensaje}`));
  if (errores.length > 0) {
    throw new Error(`Configuración de producción incompleta: ${errores.join(' ')}`);
  }

  const app = await NestFactory.create(AppModule);
  configurarConfianzaProxy(app);
  app.enableShutdownHooks(); // Permite que la aplicación escuche eventos de apagado para realizar tareas de limpieza antes de cerrar.
  app.setGlobalPrefix("api/v1");

  // CORS_ORIGENES (lista separada por comas), CORS_ORIGEN (nombre anterior) y FRONTEND_URL.
  // El navegador usa el BFF de Next (/api/v1 en el mismo dominio de Vercel); CORS solo aplica
  // si algún cliente llama al backend de Render directamente.
  const origenesCors = resolverOrigenesCors();
  app.enableCors({
    origin: origenesCors,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new FiltroExcepcionHttp());

  // Swagger: libre fuera de producción; en producción solo con SWAGGER_HABILITADO=true y HTTP Basic
  // (SWAGGER_USUARIO / SWAGGER_CLAVE). El contrato versionado vive en docs/contrato-api/openapi.json.
  const accesoSwagger = resolverAccesoSwagger();
  accesoSwagger.advertencias.forEach((mensaje) => console.warn(`[configuración] ${mensaje}`));
  if (accesoSwagger.montar) {
    if (accesoSwagger.credenciales) {
      // Debe registrarse antes de SwaggerModule.setup para cubrir /api/docs, sus recursos y /api/docs-json|yaml.
      app.use(crearMiddlewareBasicSwagger(accesoSwagger.credenciales));
    }
    const documento = crearDocumentoOpenApi(app);
    SwaggerModule.setup(RUTA_SWAGGER, app, documento, {
      customSiteTitle: 'SIAC API — Documentación',
    });
  }

  const prisma = app.get(PrismaService);
  await advertirRolAplicacionBaseDatos(prisma);

  // Render inyecta PORT y exige escuchar en 0.0.0.0; en local se usa PUERTO (3001).
  const puerto = resolverPuerto();
  await app.listen(puerto, '0.0.0.0');
  const swagger = accesoSwagger.montar
    ? `, Swagger en /${RUTA_SWAGGER}${accesoSwagger.credenciales ? ' (protegido con HTTP Basic)' : ''}`
    : '';
  console.log(`SIAC API escuchando en el puerto ${puerto} (prefijo /api/v1${swagger})`);
  console.log(`CORS permitido para: ${origenesCors.join(', ') || '(ningún origen)'}`);
}

bootstrap();
