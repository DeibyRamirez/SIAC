/**
 * Crea EvidenciaVersion v1 para evidencias legacy que tienen rutaArchivo pero sin historial.
 * Uso: pnpm prisma:backfill-versiones
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const evidencias = await prisma.evidencia.findMany({
    where: { rutaArchivo: { not: null } },
    select: {
      id: true,
      version: true,
      nombreArchivo: true,
      rutaArchivo: true,
      mimeType: true,
      tamanoBytes: true,
      autorId: true,
    },
  });

  let creadas = 0;
  let omitidas = 0;

  for (const ev of evidencias) {
    if (!ev.rutaArchivo) continue;

    const versionNumero = ev.version ?? 1;
    const existente = await prisma.evidenciaVersion.findUnique({
      where: {
        evidenciaId_numero: { evidenciaId: ev.id, numero: versionNumero },
      },
    });

    if (existente) {
      omitidas++;
      continue;
    }

    await prisma.evidenciaVersion.create({
      data: {
        evidenciaId: ev.id,
        numero: versionNumero,
        nombreArchivo: ev.nombreArchivo,
        rutaArchivo: ev.rutaArchivo,
        mimeType: ev.mimeType ?? undefined,
        tamanoBytes: ev.tamanoBytes ?? undefined,
        subidoPorId: ev.autorId,
      },
    });
    creadas++;
  }

  console.log(`Backfill completado: ${creadas} versiones creadas, ${omitidas} ya existían.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
