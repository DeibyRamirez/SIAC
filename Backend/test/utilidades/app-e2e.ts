import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AlmacenamientoService } from '../../src/almacenamiento/almacenamiento.service';
import { FiltroExcepcionHttp } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.module';
import { AlmacenamientoMemoria } from './almacenamiento-memoria';

/** Credenciales de prisma/semilla.ts (solo existen en BD locales o de CI). */
export const USUARIOS_SEMILLA = {
  Cargador: { correo: 'maria.cargadora@uniautonoma.edu.co', contrasena: 'Cargador2026' },
  Revisor: { correo: 'revisor.calidad@uniautonoma.edu.co', contrasena: 'Revisor2026' },
  Administrador: { correo: 'admin.planeacion@uniautonoma.edu.co', contrasena: 'Admin2026' },
  ParAcademico: { correo: 'par.academico@uniautonoma.edu.co', contrasena: 'Par2026' },
} as const;

export interface ContextoE2E {
  app: INestApplication;
  prisma: PrismaService;
  almacen: AlmacenamientoMemoria;
}

/**
 * Las pruebas E2E borran y crean datos: solo se permiten contra PostgreSQL local o de CI.
 * Para otro host hay que declararlo explícitamente con SIAC_E2E_PERMITIR_BD_REMOTA=true.
 */
export function verificarBaseDeDatosDesechable(): void {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('DATABASE_URL no es una URL válida para las pruebas E2E.');
  }
  const esLocal = host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  if (!esLocal && process.env.SIAC_E2E_PERMITIR_BD_REMOTA !== 'true') {
    throw new Error(
      `Las pruebas E2E solo corren contra una BD local o de CI (host actual: ${host}).`,
    );
  }
}

/** Levanta la API completa (mismo prefijo, pipes y filtro que main.ts) con Storage en memoria. */
export async function crearAppE2E(): Promise<ContextoE2E> {
  verificarBaseDeDatosDesechable();
  const almacen = new AlmacenamientoMemoria();
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AlmacenamientoService)
    .useValue(almacen)
    .compile();

  const app = modulo.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new FiltroExcepcionHttp());
  await app.init();

  return { app, prisma: app.get(PrismaService), almacen };
}

export async function iniciarSesion(
  app: INestApplication,
  rol: keyof typeof USUARIOS_SEMILLA,
): Promise<{ token: string; usuarioId: string }> {
  const respuesta = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send(USUARIOS_SEMILLA[rol])
    .expect(200);
  return { token: respuesta.body.token, usuarioId: respuesta.body.usuario.id };
}

/**
 * Deja la BD como después de `migrate deploy` + semilla: borra datos de negocio creados
 * por las pruebas y conserva usuarios semilla, institución y catálogo de trámites.
 */
export async function limpiarDatosNegocio(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "EvaluacionCondicionEvidencia",
      "EvaluacionCondicionInstitucionalEvidencia",
      "EvidenciaVersion",
      "HistorialEvidencia",
      "AlertaInApp",
      "ResolucionMen",
      "Evidencia",
      "AnexoVigencia",
      "UsuarioPrograma",
      "Programa"
    CASCADE
  `);
  await prisma.usuario.deleteMany({ where: { correo: { endsWith: '@e2e.siac.test' } } });
}
