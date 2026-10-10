/**
 * Limpieza de AnexoVigencia sin documento (decisión del PO, 06/10; R-D punto 5).
 *
 * Borra las filas de "AnexoVigencia" que no tienen documento archivado ("rutaArchivo" nulo o vacío),
 * por ejemplo los antiguos anx-seed-001/002. NO es una migración: se ejecuta a mano y de forma explícita.
 *
 * Uso (desde Backend/, con DATABASE_URL apuntando a la BD que se quiere limpiar):
 *   pnpm datos:limpiar-anexos-sin-documento                 # simulación: respalda y cuenta, no borra
 *   pnpm datos:limpiar-anexos-sin-documento -- --ejecutar   # respalda y borra
 *
 * Opciones:
 *   --ejecutar                Borra de verdad (sin esta opción solo simula).
 *   --salida=<carpeta>        Carpeta del respaldo JSON/CSV (por defecto Backend/respaldos, ignorada por git).
 *   --permitir-bd-remota      Necesaria si DATABASE_URL no es localhost/127.0.0.1/postgres (p. ej. producción),
 *                             tras la aprobación del PO y con un respaldo de la BD.
 *
 * Es idempotente: una segunda ejecución no encuentra filas y no borra nada. Antes de borrar exporta
 * las filas a JSON y CSV y, al final, informa cuántas borró y cuántas quedan sin documento (debe ser 0).
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const FILTRO_SIN_DOCUMENTO: Prisma.AnexoVigenciaWhereInput = {
  OR: [{ rutaArchivo: null }, { rutaArchivo: '' }],
};

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

function hostDeBd(url: string | undefined): string {
  try {
    return new URL(url ?? '').hostname;
  } catch {
    throw new Error('DATABASE_URL no es una URL válida.');
  }
}

/** Convierte las filas a CSV (separador coma, comillas dobles escapadas). */
export function aCsv(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) return '';
  const columnas = Object.keys(filas[0]);
  const celda = (valor: unknown) => {
    const texto = valor instanceof Date ? valor.toISOString() : valor === null || valor === undefined ? '' : String(valor);
    return `"${texto.replace(/"/g, '""')}"`;
  };
  return [columnas.join(','), ...filas.map((fila) => columnas.map((c) => celda(fila[c])).join(','))].join('\n') + '\n';
}

export async function limpiarAnexosSinDocumento(prisma: PrismaClient, opciones: Opciones) {
  const filas = await prisma.anexoVigencia.findMany({ where: FILTRO_SIN_DOCUMENTO, orderBy: { createdAt: 'asc' } });
  console.log(`Anexos sin documento encontrados: ${filas.length}`);

  let respaldo: { json: string; csv: string } | null = null;
  if (filas.length > 0) {
    mkdirSync(opciones.salida, { recursive: true });
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    respaldo = {
      json: join(opciones.salida, `anexos-sin-documento-${marca}.json`),
      csv: join(opciones.salida, `anexos-sin-documento-${marca}.csv`),
    };
    writeFileSync(respaldo.json, JSON.stringify(filas, null, 2), 'utf8');
    writeFileSync(respaldo.csv, aCsv(filas as unknown as Record<string, unknown>[]), 'utf8');
    console.log(`Respaldo: ${respaldo.json}`);
    console.log(`Respaldo: ${respaldo.csv}`);
  }

  let borradas = 0;
  if (opciones.ejecutar && filas.length > 0) {
    // Se borran exactamente los ids respaldados (y que sigan sin documento).
    const resultado = await prisma.anexoVigencia.deleteMany({
      where: { AND: [{ id: { in: filas.map((f) => f.id) } }, FILTRO_SIN_DOCUMENTO] },
    });
    borradas = resultado.count;
  }
  const restantes = await prisma.anexoVigencia.count({ where: FILTRO_SIN_DOCUMENTO });

  console.log(opciones.ejecutar ? `Anexos borrados: ${borradas}` : 'Simulación: no se borró nada (use --ejecutar).');
  console.log(`Anexos sin documento restantes: ${restantes}`);
  return { encontradas: filas.length, borradas, restantes, respaldo };
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
    await limpiarAnexosSinDocumento(prisma, opciones);
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
