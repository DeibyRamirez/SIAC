import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AlmacenamientoService } from '../../src/almacenamiento/almacenamiento.service';
import { resolverClavesSemilla } from '../../src/common/config/claves-semilla';
import { esHostDesechable, hostDeUrlBaseDatos } from '../../src/common/config/host-base-datos';
import { FiltroExcepcionHttp } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.module';
import { AlmacenamientoMemoria } from './almacenamiento-memoria';
import { CorreoMemoriaProveedor } from './correo-memoria';
import { CorreoNuloProveedor } from '../../src/correo/correo-nulo.proveedor';
import { PROVEEDOR_CORREO } from '../../src/correo/proveedor-correo.port';

/**
 * Credenciales de prisma/semilla.ts (solo existen en BD locales o de CI). Las contraseñas se
 * resuelven igual que en la semilla: SEMILLA_CLAVE_* o, si faltan, las claves de desarrollo.
 */
const CLAVES_SEMILLA = resolverClavesSemilla(process.env);

export const USUARIOS_SEMILLA = {
  Cargador: { correo: 'maria.cargadora@uniautonoma.edu.co', contrasena: CLAVES_SEMILLA.Cargador },
  Revisor: { correo: 'revisor.calidad@uniautonoma.edu.co', contrasena: CLAVES_SEMILLA.Revisor },
  Administrador: {
    correo: 'admin.planeacion@uniautonoma.edu.co',
    contrasena: CLAVES_SEMILLA.Administrador,
  },
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
    host = hostDeUrlBaseDatos(url);
  } catch {
    throw new Error('DATABASE_URL no es una URL válida para las pruebas E2E.');
  }
  if (!esHostDesechable(host) && process.env.SIAC_E2E_PERMITIR_BD_REMOTA !== 'true') {
    throw new Error(
      `Las pruebas E2E solo corren contra una BD local o de CI (host actual: ${host}).`,
    );
  }
}

export interface OpcionesAppE2E {
  /** Evita llamadas a Resend/SMTP en pruebas que solo validan AlertaInApp. */
  correoNulo?: boolean;
  /** Proveedor de correo en memoria para verificar asuntos, cuerpos y enlaces. */
  correoMemoria?: CorreoMemoriaProveedor;
}

/** Levanta la API completa (mismo prefijo, pipes y filtro que main.ts) con Storage en memoria. */
export async function crearAppE2E(opciones: OpcionesAppE2E = {}): Promise<ContextoE2E> {
  // El .env local no debe alterar los E2E (demo de vigencia ni correo real). Deben fijarse ANTES
  // de importar AppModule: ConfigModule.forRoot congela el .env y las factorías al importarlo.
  process.env.VIGENCIA_MODO_PRUEBA = 'false';
  process.env.CORREO_CANAL = 'ninguno';
  const { AppModule } = await import('../../src/app.module');
  verificarBaseDeDatosDesechable();
  const almacen = new AlmacenamientoMemoria();
  if (opciones.correoMemoria) {
    // T-007.3f: en pruebas los correos solo salen si están en la lista permitida; la suite E2E
    // suma los correos semilla a la lista configurada (el procesador del outbox la aplica).
    const correosSemilla = Object.values(USUARIOS_SEMILLA)
      .map((usuario) => usuario.correo)
      .join(',');
    process.env.CORREO_DESTINATARIOS_PERMITIDOS = [
      process.env.CORREO_DESTINATARIOS_PERMITIDOS,
      correosSemilla,
    ]
      .filter(Boolean)
      .join(',');
  }
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AlmacenamientoService)
    .useValue(almacen);
  if (opciones.correoMemoria) {
    builder = builder.overrideProvider(PROVEEDOR_CORREO).useValue(opciones.correoMemoria);
  } else if (opciones.correoNulo) {
    builder = builder.overrideProvider(PROVEEDOR_CORREO).useClass(CorreoNuloProveedor);
  }
  const modulo = await builder.compile();

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
      "NotificacionSalida",
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
