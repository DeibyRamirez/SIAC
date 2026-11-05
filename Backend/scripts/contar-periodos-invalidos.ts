/**
 * Consulta de solo lectura: cuenta evidencias cuyo `periodo` no cumple ^\d{4}-[12]$.
 * No actualiza, no borra y no migra filas.
 *
 * Desde Backend/, con DATABASE_URL (o un .env en esta carpeta):
 *   pnpm datos:contar-periodos-invalidos
 *
 * Equivalente en SQL, también de solo lectura:
 *   SELECT COUNT(*) FROM "Evidencia" WHERE periodo !~ '^[0-9]{4}-[12]$';
 */
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

try {
  // Opcional: carga Backend/.env si dotenv está instalado (dependencia de @nestjs/config).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: resolve(__dirname, '../.env') });
} catch {
  // DATABASE_URL puede venir ya definida en el entorno.
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Falta DATABASE_URL. Exporte la variable o cree Backend/.env y vuelva a ejecutar pnpm datos:contar-periodos-invalidos.',
    );
  }

  const prisma = new PrismaClient();
  try {
    const total = await prisma.evidencia.count();
    const filas = await prisma.$queryRaw<Array<{ cantidad: bigint }>>`
      SELECT COUNT(*)::bigint AS cantidad
      FROM "Evidencia"
      WHERE periodo !~ '^[0-9]{4}-[12]$'
    `;
    const invalidas = Number(filas[0]?.cantidad ?? 0);
    console.log(
      JSON.stringify(
        {
          total,
          invalidas,
          formatoEsperado: 'AAAA-1 o AAAA-2',
          soloLectura: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
