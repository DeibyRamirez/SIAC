/**
 * Crea el primer SuperAdmin. No lo llama migrate, el CI ni start:despliegue.
 *
 * Uso recomendado (seguro, interactivo): `pnpm prisma:primer-admin` desde una terminal.
 * Pregunta nombre, correo y clave; la clave se escribe oculta (no se muestra), no queda
 * en el historial de la terminal ni en archivos del repositorio.
 *
 * Alternativa no interactiva (automatización/CI): definir SOLO en el entorno del proceso
 * PRIMER_ADMIN_NOMBRE, PRIMER_ADMIN_CORREO y PRIMER_ADMIN_CLAVE (mínimo 12 caracteres).
 * Esas variables no se leen de Backend/.env a propósito: el .env es solo para la conexión
 * (DATABASE_URL/DIRECT_URL) y la configuración no sensible.
 *
 * Aborta si ya hay algún usuario. No hay contraseña ni cuenta por defecto, y las
 * migraciones o la semilla no insertan usuarios.
 */
import { OrigenDato, PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parseEnv } from 'node:util';

const LONGITUD_MINIMA_CLAVE = 12;

/** Configuración: Backend/.env y luego el entorno del proceso (el entorno gana). */
function leerConfiguracion(): Record<string, string | undefined> {
  const ruta = resolve(__dirname, '..', '.env');
  const desdeArchivo = existsSync(ruta) ? parseEnv(readFileSync(ruta, 'utf8')) : {};
  return { ...desdeArchivo, ...process.env };
}

async function preguntar(texto: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(texto)).trim();
  } finally {
    rl.close();
  }
}

/** Lee una clave sin mostrarla ni dejarla en el historial de la terminal. */
function preguntarClave(texto: string): Promise<string> {
  return new Promise<string>((resolver, rechazar) => {
    let valor = '';
    const terminar = (accion: () => void) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', alRecibir);
      stdout.write('\n');
      accion();
    };
    const alRecibir = (fragmento: string) => {
      for (const caracter of fragmento) {
        if (caracter === '\u0003') {
          terminar(() =>
            rechazar(new Error('[primer-admin] Cancelado (Ctrl+C). No se creó ningún usuario.')),
          );
          return;
        }
        if (caracter === '\r' || caracter === '\n') {
          terminar(() => resolver(valor));
          return;
        }
        if (caracter === '\u007f' || caracter === '\b') {
          if (valor.length > 0) {
            valor = valor.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (caracter >= ' ') {
          valor += caracter;
          stdout.write('*');
        }
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdout.write(texto);
    stdin.on('data', alRecibir);
  });
}

interface Credenciales {
  nombre: string;
  correo: string;
  clave: string;
}

async function leerCredenciales(dominio: string): Promise<Credenciales> {
  const nombreEntorno = process.env.PRIMER_ADMIN_NOMBRE?.trim() ?? '';
  const correoEntorno = process.env.PRIMER_ADMIN_CORREO?.trim().toLowerCase() ?? '';
  const claveEntorno = process.env.PRIMER_ADMIN_CLAVE?.trim() ?? '';

  if (nombreEntorno && correoEntorno && claveEntorno) {
    return { nombre: nombreEntorno, correo: correoEntorno, clave: claveEntorno };
  }

  if (!stdin.isTTY) {
    throw new Error(
      '[primer-admin] Faltan PRIMER_ADMIN_NOMBRE, PRIMER_ADMIN_CORREO o PRIMER_ADMIN_CLAVE ' +
        'en el entorno del proceso y la terminal no es interactiva. No hay contraseña por defecto.',
    );
  }

  console.log(
    '[primer-admin] Creación interactiva: la clave no se muestra y no queda en el historial.',
  );
  const nombre = nombreEntorno || (await preguntar('Nombre del SuperAdmin: '));
  const correo = (correoEntorno || (await preguntar(`Correo (@${dominio}): `))).toLowerCase();
  let clave = claveEntorno;
  if (!clave) {
    clave = await preguntarClave(`Clave (mínimo ${LONGITUD_MINIMA_CLAVE} caracteres, no se muestra): `);
    const confirmacion = await preguntarClave('Repita la clave: ');
    if (clave !== confirmacion) {
      throw new Error('[primer-admin] Las claves no coinciden. No se creó ningún usuario.');
    }
  }
  return { nombre, correo, clave };
}

async function main() {
  const configuracion = leerConfiguracion();
  const dominio = (configuracion.DOMINIO_INSTITUCIONAL?.trim() || 'uniautonoma.edu.co').toLowerCase();

  const { nombre, correo, clave } = await leerCredenciales(dominio);

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
  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(correo) || !correo.endsWith(`@${dominio}`)) {
    console.error(`[primer-admin] El correo debe ser válido y pertenecer al dominio @${dominio}.`);
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasourceUrl: configuracion.DIRECT_URL ?? configuracion.DATABASE_URL,
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
      console.log(
        '[primer-admin] Guarde la clave en un gestor de contraseñas: no quedó escrita en ningún archivo.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
  process.exit(codigo);
}

main().catch((error) => {
  if (error instanceof Error && error.message.startsWith('[primer-admin]')) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
