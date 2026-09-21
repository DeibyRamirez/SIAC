import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FiltroExcepcionHttp } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.CORS_ORIGEN ?? 'http://localhost:3000',
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

  const configSwagger = new DocumentBuilder()
    .setTitle('SIAC API')
    .setDescription('Sistema Interno de Aseguramiento de la Calidad — CUAC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documento = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, documento);

  const puerto = process.env.PUERTO ?? 3001;
  await app.listen(puerto);
  console.log(`SIAC API escuchando en http://localhost:${puerto}/api/v1`);
  console.log(`Swagger disponible en http://localhost:${puerto}/api/docs`);
}

bootstrap();
