/**
 * §0 Demo vigencia acelerada (T-007.3i): crea/reinicia el programa «DEMO Vigencia acelerada»
 * con fecha de resolución = ahora, para recorrer verde → amarillo (≈214 s) → rojo (≈236 s) →
 * vencido (300 s) con VIGENCIA_DURACION_PRUEBA_SEG=300.
 *
 * Solo corre con VIGENCIA_MODO_PRUEBA=true, NODE_ENV != production y DATABASE_URL apuntando a
 * una BD local (localhost/127.0.0.1/postgres) o a un host declarado en VIGENCIA_DEMO_HOSTS_PERMITIDOS.
 * Uso: pnpm demo:vigencia
 */
import { PrismaClient, TipoTramiteSIAC } from '@prisma/client';
import { esHostDesechable, hostDeUrlBaseDatos } from '../src/common/config/host-base-datos';

const prisma = new PrismaClient();

const CODIGO_DEMO = 'DEMO-VIG';
const SLUG_DEMO = 'demo-vigencia-acelerada';
const NOMBRE_DEMO = 'DEMO Vigencia acelerada';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La demo de vigencia no puede ejecutarse con NODE_ENV=production.');
  }
  const modoPrueba =
    process.env.VIGENCIA_MODO_PRUEBA === 'true' || process.env.VIGENCIA_MODO_PRUEBA === '1';
  if (!modoPrueba) {
    throw new Error(
      'Active VIGENCIA_MODO_PRUEBA=true (en Backend/.env) antes de ejecutar pnpm demo:vigencia.',
    );
  }

  // La demo escribe datos de negocio: nunca contra una BD compartida/remota (p. ej. Supabase).
  let host: string;
  try {
    host = hostDeUrlBaseDatos(process.env.DATABASE_URL);
  } catch {
    throw new Error(
      'DATABASE_URL no es una URL válida; la demo de vigencia solo corre contra una BD local.',
    );
  }
  const hostsPermitidos = (process.env.VIGENCIA_DEMO_HOSTS_PERMITIDOS ?? '')
    .split(',')
    .map((permitido) => permitido.trim())
    .filter(Boolean);
  if (!esHostDesechable(host, hostsPermitidos)) {
    throw new Error(
      `La demo de vigencia escribe datos y DATABASE_URL apunta a un host no permitido (${host}). ` +
        'Use una BD local (localhost/127.0.0.1) o declare VIGENCIA_DEMO_HOSTS_PERMITIDOS con los hosts autorizados.',
    );
  }

  const ahora = new Date();
  const programa = await prisma.programa.upsert({
    where: { codigo: CODIGO_DEMO },
    update: {
      nombre: NOMBRE_DEMO,
      slug: SLUG_DEMO,
      fechaResolucion: ahora,
      inicioCicloTramiteAt: ahora,
      activo: true,
    },
    create: {
      nombre: NOMBRE_DEMO,
      codigo: CODIGO_DEMO,
      slug: SLUG_DEMO,
      nivel: 'Pregrado',
      tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
      fechaResolucion: ahora,
      inicioCicloTramiteAt: ahora,
      activo: true,
    },
  });

  const duracion = parseInt(process.env.VIGENCIA_DURACION_PRUEBA_SEG ?? '300', 10);
  console.log('Demo de vigencia lista.');
  console.log(`  Programa: ${programa.nombre} (${programa.codigo}) id=${programa.id}`);
  console.log(`  Resolución MEN: ${ahora.toISOString()}`);
  console.log(`  Escala: ${duracion} s ≈ 7 años (amarillo ~${Math.round((5 / 7) * duracion)} s, rojo ~${Math.round((5.5 / 7) * duracion)} s, vencido ${duracion} s).`);
  console.log('Inicie la prueba en la UI (Administrador) con «Iniciar prueba de vigencia».');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
