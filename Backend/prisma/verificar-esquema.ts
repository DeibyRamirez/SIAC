/**
 * Verifica que el esquema remoto tenga objetos del versionado documental.
 * Uso: pnpm prisma:verify
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TABLAS_REQUERIDAS = ['EvidenciaVersion', 'EvidenciaComentario'];

const COLUMNAS_EVIDENCIA = ['version', 'rutaArchivo'];

const COLUMNAS_ANEXO = ['carpeta', 'nombreArchivo', 'rutaArchivo', 'aniosVigencia', 'fechaCarga'];

const ESTADOS_CANONICOS = new Set(['Borrador', 'EnRevision', 'Validado', 'Rechazado']);

async function estadosLegacy(): Promise<{ tabla: string; estado: string; total: number }[]> {
  const filas: { tabla: string; estado: string; total: number }[] = [];
  for (const tabla of ['Evidencia', 'HistorialEvidencia']) {
    try {
      const conteos = await prisma.$queryRawUnsafe<{ estado: string; total: number }[]>(
        `SELECT "estado"::text AS estado, COUNT(*)::int AS total FROM "${tabla}" GROUP BY "estado"::text`,
      );
      for (const fila of conteos) {
        if (!ESTADOS_CANONICOS.has(fila.estado)) {
          filas.push({ tabla, estado: fila.estado, total: fila.total });
        }
      }
    } catch {
      // Tabla no disponible aún.
    }
  }
  return filas;
}

async function existeTabla(nombre: string): Promise<boolean> {
  const filas = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${nombre}
    ) AS exists
  `;
  return Boolean(filas[0]?.exists);
}

async function columnasDeTabla(tabla: string): Promise<string[]> {
  const filas = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tabla}
  `;
  return filas.map((f) => f.column_name);
}

async function main() {
  console.log('Verificando esquema SIAC (versionado documental)...\n');

  let ok = true;

  for (const tabla of TABLAS_REQUERIDAS) {
    const existe = await existeTabla(tabla);
    console.log(`${existe ? '✓' : '✗'} Tabla ${tabla}`);
    if (!existe) ok = false;
  }

  const colsEvidencia = await columnasDeTabla('Evidencia');
  for (const col of COLUMNAS_EVIDENCIA) {
    const existe = colsEvidencia.includes(col);
    console.log(`${existe ? '✓' : '✗'} Evidencia.${col}`);
    if (!existe) ok = false;
  }

  const colsAnexo = await columnasDeTabla('AnexoVigencia');
  for (const col of COLUMNAS_ANEXO) {
    const existe = colsAnexo.includes(col);
    console.log(`${existe ? '✓' : '✗'} AnexoVigencia.${col}`);
    if (!existe) ok = false;
  }

  const legacy = await estadosLegacy();
  if (legacy.length > 0) {
    ok = false;
    console.log('✗ Estados legacy en EstadoEvidencia:');
    for (const fila of legacy) {
      console.log(`   · ${fila.tabla}.estado='${fila.estado}' (${fila.total} filas)`);
    }
  } else {
    console.log('✓ Sin estados legacy en Evidencia/HistorialEvidencia');
  }

  console.log('');
  if (ok) {
    console.log('Esquema OK. Puede ejecutar pnpm prisma:seed');
    process.exit(0);
  }

  console.error('Esquema incompleto. Ejecute: pnpm prisma:repair-schema');
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
