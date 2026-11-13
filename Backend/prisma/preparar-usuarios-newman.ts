/**
 * Cuentas efímeras para Newman (mismos correos que E2E, clave solo por variable de entorno).
 * Solo hosts desechables (localhost / postgres de CI).
 */
import { OrigenDato, PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  abortarScriptSiProduccion,
  esHostDesechable,
  hostDeUrlBaseDatos,
} from '../src/common/config/host-base-datos';

const LONGITUD_MINIMA = 12;

const FILAS = [
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
] as const;

function verificarEntorno(): string {
  abortarScriptSiProduccion('newman');
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
  const host = hostDeUrlBaseDatos(url);
  if (!esHostDesechable(host)) {
    throw new Error(
      `[newman] Solo se preparan usuarios en BD local/CI (host actual: ${host}).`,
    );
  }
  const clave = process.env.NEWMAN_CLAVE_PRUEBA ?? '';
  if (clave.length < LONGITUD_MINIMA) {
    throw new Error(
      `[newman] NEWMAN_CLAVE_PRUEBA debe tener al menos ${LONGITUD_MINIMA} caracteres (solo en la terminal/CI).`,
    );
  }
  return clave;
}

async function main(): Promise<void> {
  const clave = verificarEntorno();
  const hash = await bcrypt.hash(clave, 4);
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });
  try {
    for (const fila of FILAS) {
      await prisma.usuario.upsert({
        where: { correo: fila.correo },
        update: { contrasena: hash, activo: true },
        create: { ...fila, contrasena: hash, origenDato: OrigenDato.Manual },
      });
    }
    console.log('[newman] Usuarios de prueba listos (4 roles, sin escribir la clave en logs).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
