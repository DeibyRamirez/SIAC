/**
 * Limpieza puntual de los datos de prueba de S3-01 (HU-009) creados durante la
 * verificación del smoke: CifraIndicador y CargaCifras de la categoría «profesores»
 * para el periodo «2025-2». NO es una migración: se ejecuta a mano.
 *
 * Uso (desde Backend/, con DATABASE_URL apuntando a la BD que se quiere limpiar):
 *   pnpm datos:limpiar-cifras-prueba                 # simulación: respalda y cuenta, no borra
 *   pnpm datos:limpiar-cifras-prueba -- --ejecutar --permitir-bd-remota
 *
 * Opciones:
 *   --ejecutar                Borra de verdad (sin esta opción solo simula).
 *   --salida=<carpeta>        Carpeta del respaldo JSON (por defecto Backend/respaldos).
 *   --permitir-bd-remota      Necesaria si DATABASE_URL no es localhost/127.0.0.1/postgres.
 *
 * Es idempotente: una segunda ejecución no encuentra filas y no borra nada.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Prisma, PrismaClient } from '@prisma/client';

const CATEGORIA = 'profesores';
const PERIODO = '2025-2';

interface Opciones {
  ejecutar: boolean;
  salida: string;
  permitirBdRemota: boolean;
}

export function leerOpciones(argumentos: string[]): Opciones {
  const salida = argumentos.find((a) => a.startsWith('--salida='))?.slice('--salida='.length);
  return {
    ejecutar: argumentos.includes('--ejecutar'),
    salida: resolve(salida || join(__dirname, '..', '..', 'respaldos')),
    permitirBdRemota: argumentos.includes('--permitir-bd-remota'),
  };
}

function inicioDelDia(): Date {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function hostDeBd(url: string | undefined): string {
  try {
    return new URL(url ?? '').hostname;
  } catch {
    throw new Error('DATABASE_URL no es una URL válida.');
  }
}

export async function limpiarCifrasPrueba(prisma: PrismaClient, opciones: Opciones) {
  const desde = inicioDelDia();
  const filtroIndicadores: Prisma.CifraIndicadorWhereInput = {
    categoriaId: CATEGORIA,
    periodo: PERIODO,
    createdAt: { gte: desde },
  };
  const filtroCargas: Prisma.CargaCifrasWhereInput = {
    categoriaId: CATEGORIA,
    createdAt: { gte: desde },
  };

  const indicadores = await prisma.cifraIndicador.findMany({
    where: filtroIndicadores,
    orderBy: { createdAt: 'asc' },
  });
  const cargas = await prisma.cargaCifras.findMany({
    where: filtroCargas,
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Indicadores de prueba encontrados: ${indicadores.length}`);
  console.log(`Cargas de prueba encontradas: ${cargas.length}`);

  let respaldo: string | null = null;
  if (indicadores.length > 0 || cargas.length > 0) {
    mkdirSync(opciones.salida, { recursive: true });
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    respaldo = join(opciones.salida, `cifras-prueba-${CATEGORIA}-${marca}.json`);
    writeFileSync(
      respaldo,
      JSON.stringify({ categoriaId: CATEGORIA, periodo: PERIODO, indicadores, cargas }, null, 2),
      'utf8',
    );
    console.log(`Respaldo: ${respaldo}`);
  }

  let indicadoresBorrados = 0;
  let cargasBorradas = 0;
  if (opciones.ejecutar) {
    // Los indicadores referencian cargas; se borran exactamente los ids respaldados.
    indicadoresBorrados = (
      await prisma.cifraIndicador.deleteMany({
        where: { id: { in: indicadores.map((fila) => fila.id) } },
      })
    ).count;
    cargasBorradas = (
      await prisma.cargaCifras.deleteMany({
        where: { id: { in: cargas.map((fila) => fila.id) } },
      })
    ).count;
  }

  const indicadoresRestantes = await prisma.cifraIndicador.count({ where: filtroIndicadores });
  const cargasRestantes = await prisma.cargaCifras.count({ where: filtroCargas });

  console.log(
    opciones.ejecutar
      ? `Borrados: ${indicadoresBorrados} indicadores, ${cargasBorradas} cargas.`
      : 'Simulación: no se borró nada (use --ejecutar).',
  );
  console.log(
    `Restantes de prueba: ${indicadoresRestantes} indicadores, ${cargasRestantes} cargas.`,
  );
  return { indicadoresBorrados, cargasBorradas, indicadoresRestantes, cargasRestantes, respaldo };
}

async function principal() {
  const opciones = leerOpciones(process.argv.slice(2));
  const host = hostDeBd(process.env.DATABASE_URL);
  const esLocal = ['localhost', '127.0.0.1', 'postgres'].includes(host);
  if (!esLocal && !opciones.permitirBdRemota) {
    throw new Error(
      `DATABASE_URL apunta a "${host}". Para una BD que no es local use --permitir-bd-remota (con aprobación del PO y respaldo previo).`,
    );
  }
  console.log(`BD: ${host} · modo: ${opciones.ejecutar ? 'EJECUTAR' : 'simulación'}`);
  const prisma = new PrismaClient();
  try {
    await limpiarCifrasPrueba(prisma, opciones);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  principal().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
