import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FiltroExcepcionHttp } from './common/filters/http-exception.filter';
import { crearDocumentoOpenApi, exponerInterfazSwagger } from './openapi/documento-openapi';
import {
  resolverOrigenesCors,
  resolverPuerto,
  validarEntornoProduccion,
} from './common/config/servidor';

async function bootstrap() {
  // En producción (Render) se detiene el arranque si falta configuración crítica.
  const { errores, advertencias } = validarEntornoProduccion();
  advertencias.forEach((mensaje) => console.warn(`[configuración] ${mensaje}`));
  if (errores.length > 0) {
    throw new Error(`Configuración de producción incompleta: ${errores.join(' ')}`);
  }

  const app = await NestFactory.create(AppModule);
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

  // La UI queda fuera de producción. El contrato versionado vive en docs/contrato-api/openapi.json.
  if (exponerInterfazSwagger()) {
    const documento = crearDocumentoOpenApi(app);
    SwaggerModule.setup('api/docs', app, documento);
  }

  // Render inyecta PORT y exige escuchar en 0.0.0.0; en local se usa PUERTO (3001).
  const puerto = resolverPuerto();
  await app.listen(puerto, '0.0.0.0');
  const swagger = exponerInterfazSwagger() ? ', Swagger en /api/docs' : '';
  console.log(`SIAC API escuchando en el puerto ${puerto} (prefijo /api/v1${swagger})`);
  console.log(`CORS permitido para: ${origenesCors.join(', ') || '(ningún origen)'}`);
}

bootstrap();
