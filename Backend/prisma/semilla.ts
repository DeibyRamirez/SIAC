/**
 * Ya no crea usuarios. Las migraciones insertan la institución, el catálogo de
 * trámites y la fila ConfiguracionSIAC. Este script solo asegura esa fila si falta
 * (`update` vacío: no cambia umbrales ya definidos).
 * El primer SuperAdmin se crea aparte, con `pnpm prisma:primer-admin`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // RLS: los scripts de mantenimiento corren como dueño (DIRECT_URL), no como siac_app.
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  await prisma.configuracionSIAC.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      avanceMinimoVerde: 100,
      avanceMinimoAmarillo: 55,
      aniosVigencia: 7,
      mesesAvisoVigencia: 12,
      mesesRojoVigencia: 6,
    },
  });

  console.log('Semilla completada: configuracion global (sin usuarios).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
