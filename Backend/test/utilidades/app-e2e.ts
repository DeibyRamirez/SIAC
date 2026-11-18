import { randomBytes } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrigenDato, PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AlmacenamientoService } from '../../src/almacenamiento/almacenamiento.service';
import {
  abortarScriptSiProduccion,
  esHostDesechable,
  hostDeUrlBaseDatos,
} from '../../src/common/config/host-base-datos';
import { FiltroExcepcionHttp } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.module';
import { AlmacenamientoMemoria } from './almacenamiento-memoria';
import { CorreoMemoriaProveedor } from './correo-memoria';
import { CorreoNuloProveedor } from '../../src/correo/correo-nulo.proveedor';
import { PROVEEDOR_CORREO } from '../../src/correo/proveedor-correo.port';

/**
 * Cuentas de las E2E. No vienen de la semilla ni de una contraseña escrita en el repo:
 * `crearAppE2E` las crea en la BD desechable con esta clave, generada al cargar el módulo.
 */
const CLAVE_PRUEBA = randomBytes(18).toString('base64url');

export const USUARIOS_SEMILLA = {
  Cargador: { correo: 'maria.cargadora@uniautonoma.edu.co', contrasena: CLAVE_PRUEBA },
  Revisor: { correo: 'revisor.calidad@uniautonoma.edu.co', contrasena: CLAVE_PRUEBA },
  Administrador: {
    correo: 'admin.planeacion@uniautonoma.edu.co',
    contrasena: CLAVE_PRUEBA,
  },
  SuperAdmin: {
    correo: 'superadmin@uniautonoma.edu.co',
    contrasena: CLAVE_PRUEBA,
  },
} as const;

const FILAS_USUARIOS_PRUEBA: Array<{
  nombre: string;
  correo: string;
  rol: RolUsuario;
  cargo: string;
  dependencia: string;
}> = [
  {
    nombre: 'María Cortés',
    correo: USUARIOS_SEMILLA.Cargador.correo,
    rol: RolUsuario.Cargador,
    cargo: 'Docente',
    dependencia: 'Ingeniería de Sistemas',
  },
  {
    nombre: 'Laura Ramírez',
    correo: USUARIOS_SEMILLA.Revisor.correo,
    rol: RolUsuario.Revisor,
    cargo: 'Profesional de Planeación',
    dependencia: 'Planeación',
  },
  {
    nombre: 'Oscar Alvarado',
    correo: USUARIOS_SEMILLA.Administrador.correo,
    rol: RolUsuario.Administrador,
    cargo: 'Director de Planeación',
    dependencia: 'Planeación',
  },
  {
    nombre: 'Ana SuperAdmin',
    correo: USUARIOS_SEMILLA.SuperAdmin.correo,
    rol: RolUsuario.SuperAdmin,
    cargo: 'Super Administrador TI',
    dependencia: 'Planeación',
  },
];

/** Solo después de `verificarBaseDeDatosDesechable`. Reescribe la clave para que coincida con este proceso. */
async function asegurarUsuariosPrueba(prisma: PrismaService): Promise<void> {
  const contrasena = await bcrypt.hash(CLAVE_PRUEBA, 4);
  for (const datos of FILAS_USUARIOS_PRUEBA) {
    await prisma.usuario.upsert({
      where: { correo: datos.correo },
      update: { contrasena, activo: true },
      create: { ...datos, contrasena, origenDato: OrigenDato.Manual },
    });
  }
}

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
  abortarScriptSiProduccion('e2e');
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
  /** Activa VIGENCIA_MODO_PRUEBA para probar la demo acelerada (por defecto desactivado). */
  modoPruebaVigencia?: boolean;
}

/** Levanta la API completa (mismo prefijo, pipes y filtro que main.ts) con Storage en memoria. */
export async function crearAppE2E(opciones: OpcionesAppE2E = {}): Promise<ContextoE2E> {
  // El .env local no debe alterar los E2E (demo de vigencia ni correo real). Deben fijarse ANTES
  // de importar AppModule: ConfigModule.forRoot congela el .env y las factorías al importarlo.
  process.env.CARRERAS_SYNC_HABILITADO = 'false';
  process.env.VIGENCIA_MODO_PRUEBA = opciones.modoPruebaVigencia ? 'true' : 'false';
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

  // Con RLS, la API corre como siac_app (DATABASE_URL). Los datos de prueba se preparan y se
  // verifican con el dueño de la BD (DIRECT_URL), que no está sujeto a la RLS.
  const urlDueno = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
  if (!esHostDesechable(hostDeUrlBaseDatos(urlDueno))) {
    throw new Error('Las cuentas de prueba solo se crean en una BD local o de CI.');
  }
  const prisma = new PrismaClient({
    datasourceUrl: urlDueno,
  }) as unknown as PrismaService;
  await asegurarUsuariosPrueba(prisma);
  const cerrarApp = app.close.bind(app);
  app.close = async () => {
    await cerrarApp();
    await prisma.$disconnect();
  };

  return { app, prisma, almacen };
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
 * Borra datos de negocio creados por las pruebas y conserva los usuarios de prueba,
 * la institución y el catálogo de trámites.
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
      "Programa",
      "CifraEstudiante",
      "CifraProfesor",
      "CifraEgresado",
      "CifraInvestigacion",
      "CifraAseguramiento",
      "CifraInfraestructura",
      "CifraBienestar",
      "CifraRelacionEntorno",
      "Integrador"
    CASCADE
  `);
  await prisma.usuario.deleteMany({ where: { correo: { endsWith: '@e2e.siac.test' } } });
}
