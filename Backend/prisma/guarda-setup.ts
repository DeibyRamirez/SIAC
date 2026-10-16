/**
 * Guarda de `pnpm prisma:setup`: se ejecuta antes de `prisma migrate deploy`, la semilla y el
 * backfill. Lee Backend/.env igual que Prisma (las variables ya definidas en el proceso tienen
 * prioridad) y aborta si la BD no es local, salvo SIAC_PERMITIR_SETUP_REMOTO=true.
 * Nunca imprime la URL completa (solo el host).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { evaluarGuardaSetup } from '../src/common/config/guarda-setup';

function leerEntorno(): Record<string, string | undefined> {
  const ruta = resolve(__dirname, '..', '.env');
  const desdeArchivo = existsSync(ruta) ? parseEnv(readFileSync(ruta, 'utf8')) : {};
  return { ...desdeArchivo, ...process.env };
}

const resultado = evaluarGuardaSetup(leerEntorno());
if (!resultado.permitido) {
  console.error(`[prisma:setup] Abortado: ${resultado.motivo}`);
  process.exit(1);
}
console.log(`[prisma:setup] ${resultado.motivo}`);
