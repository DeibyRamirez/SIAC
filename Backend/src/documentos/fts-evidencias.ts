import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

/**
 * Resuelve IDs de evidencias que coinciden con FTS PostgreSQL (websearch_to_tsquery + unaccent).
 */
export async function buscarIdsEvidenciasFts(
  prisma: PrismaService,
  consulta: string,
  limite = 500,
): Promise<string[]> {
  const texto = consulta.trim();
  if (!texto) return [];

  const filas = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT e."id"
      FROM "Evidencia" e
      WHERE e."searchVector" @@ websearch_to_tsquery('spanish', f_unaccent(${texto}))
      ORDER BY ts_rank(e."searchVector", websearch_to_tsquery('spanish', f_unaccent(${texto}))) DESC
      LIMIT ${limite}
    `,
  );

  return filas.map((fila) => fila.id);
}
