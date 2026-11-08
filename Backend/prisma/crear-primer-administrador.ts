/**
 * Crea el primer SuperAdmin. No lo llama migrate, el CI ni start:despliegue.
 *
 * Exige en el entorno del proceso (no en el repositorio):
 *   PRIMER_ADMIN_NOMBRE, PRIMER_ADMIN_CORREO, PRIMER_ADMIN_CLAVE (mínimo 12 caracteres).
 * Aborta si ya hay algún usuario. No tiene contraseña por defecto.
 * DATABASE_URL y DIRECT_URL se leen de Backend/.env o del entorno, igual que la semilla.
 */
import { OrigenDato, PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const LONGITUD_MINIMA_CLAVE = 12;

function leerConexion(): Record<string, string | undefined> {
  const ruta = resolve(__dirname, '..', '.env');
  const desdeArchivo = existsSync(ruta) ? parseEnv(readFileSync(ruta, 'utf8')) : {};
  return { ...desdeArchivo, ...process.env };
}

async function main() {
  const nombre = process.env.PRIMER_ADMIN_NOMBRE?.trim() ?? '';
  const correo = process.env.PRIMER_ADMIN_CORREO?.trim().toLowerCase() ?? '';
  const clave = process.env.PRIMER_ADMIN_CLAVE?.trim() ?? '';
  const dominio = (process.env.DOMINIO_INSTITUCIONAL?.trim() || 'uniautonoma.edu.co').toLowerCase();

  const faltan: string[] = [];
  if (!nombre) faltan.push('PRIMER_ADMIN_NOMBRE');
  if (!correo) faltan.push('PRIMER_ADMIN_CORREO');
  if (!clave) faltan.push('PRIMER_ADMIN_CLAVE');
  if (faltan.length > 0) {
    console.error(
      `[primer-admin] Faltan ${faltan.join(', ')}. Defínalas en la terminal. No hay contraseña por defecto.`,
    );
    process.exit(1);
  }
  if (clave.length < LONGITUD_MINIMA_CLAVE) {
    console.error(
      `[primer-admin] PRIMER_ADMIN_CLAVE debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`,
    );
    process.exit(1);
  }
  if (!correo.endsWith(`@${dominio}`)) {
    console.error(`[primer-admin] El correo debe pertenecer al dominio @${dominio}.`);
    process.exit(1);
  }

  const conexion = leerConexion();
  const prisma = new PrismaClient({
    datasourceUrl: conexion.DIRECT_URL ?? conexion.DATABASE_URL,
  });

  let codigo = 0;
  try {
    const existentes = await prisma.usuario.count();
    if (existentes > 0) {
      console.error(
        `[primer-admin] Abortado: ya hay ${existentes} usuario(s). Este comando solo crea la primera cuenta.`,
      );
      codigo = 1;
    } else {
      const contrasena = await bcrypt.hash(clave, 10);
      await prisma.usuario.create({
        data: {
          nombre,
          correo,
          contrasena,
          rol: RolUsuario.SuperAdmin,
          origenDato: OrigenDato.Manual,
          cargo: 'Super Administrador',
          dependencia: 'Planeación',
        },
      });
      console.log(`[primer-admin] SuperAdmin creado: ${correo}`);
    }
  } finally {
    await prisma.$disconnect();
  }
  process.exit(codigo);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
