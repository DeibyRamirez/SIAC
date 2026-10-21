/**
 * Semilla mínima: solo un usuario por rol para poder iniciar sesión.
 * Programas, estructura, vigencias, evidencias y plantillas se crean desde la app
 * (o por CSV / Supabase Storage). El catálogo de trámites SIAC y la institución CUAC
 * los insertan las migraciones.
 */
import { PrismaClient, RolUsuario, OrigenDato } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import {
  ErrorClavesSemilla,
  RolSemilla,
  resolverClavesSemilla,
} from '../src/common/config/claves-semilla';
const prisma = new PrismaClient();

/**
 * Las contraseñas no viven en el código: se leen de SEMILLA_CLAVE_* (ver Backend/.env.example).
 * En producción son obligatorias; en desarrollo hay claves de desarrollo de respaldo.
 * `upsert` con `update: {}` no cambia la contraseña de un usuario que ya existe.
 */
const USUARIOS_SEMILLA: Array<{
  nombre: string;
  correo: string;
  rol: RolSemilla;
  cargo: string;
  dependencia: string;
}> = [
  {
    nombre: 'María Cortés',
    correo: 'maria.cargadora@uniautonoma.edu.co',
    rol: RolUsuario.Cargador,
    cargo: 'Docente',
    dependencia: 'Ingeniería de Sistemas',
  },
  {
    nombre: 'Laura Ramírez',
    correo: 'revisor.calidad@uniautonoma.edu.co',
    rol: RolUsuario.Revisor,
    cargo: 'Profesional de Planeación',
    dependencia: 'Planeación',
  },
  {
    nombre: 'Oscar Alvarado',
    correo: 'admin.planeacion@uniautonoma.edu.co',
    rol: RolUsuario.Administrador,
    cargo: 'Director de Planeación',
    dependencia: 'Planeación',
  },
  {
    nombre: 'Ana SuperAdmin',
    correo: 'superadmin@uniautonoma.edu.co',
    rol: RolUsuario.SuperAdmin,
    cargo: 'Super Administrador TI',
    dependencia: 'Planeación',
  },
];

/** Backend/.env más el entorno del proceso (este tiene prioridad), igual que guarda-setup. */
function leerEntorno(): Record<string, string | undefined> {
  const ruta = resolve(__dirname, '..', '.env');
  const desdeArchivo = existsSync(ruta) ? parseEnv(readFileSync(ruta, 'utf8')) : {};
  return { ...desdeArchivo, ...process.env };
}

async function main() {
  let claves: Record<RolSemilla, string>;
  try {
    claves = resolverClavesSemilla(leerEntorno());
  } catch (error) {
    if (error instanceof ErrorClavesSemilla) {
      console.error(`[semilla] ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  console.log('Sembrando usuarios SIAC (uno por rol)...');

  for (const datos of USUARIOS_SEMILLA) {
    const contrasena = await bcrypt.hash(claves[datos.rol], 10);
    await prisma.usuario.upsert({
      where: { correo: datos.correo },
      update: {},
      create: { ...datos, contrasena, origenDato: OrigenDato.Manual },
    });
  }

  // T-010.2/T-007.3a: umbrales vigentes del semáforo (la migración ya inserta la fila; esto la asegura).
  await prisma.configuracionSIAC.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      avanceMinimoVerde: 100,
      avanceMinimoAmarillo: 55,
      aniosVigencia: 7,
      mesesAvisoVigencia: 24,
      mesesRojoVigencia: 18,
    },
  });

  console.log('Semilla completada:', {
    usuarios: USUARIOS_SEMILLA.length,
    configuracion: 'global',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
