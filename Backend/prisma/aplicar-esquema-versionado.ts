/**
 * Aplica SQL de versionado cuando migrate deploy no lo ejecutó
 * (p. ej. tras migrate resolve --applied sin correr el SQL).
 * Uso: pnpm prisma:repair-schema
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SENTENCIAS: string[] = [
  `ALTER TABLE "Evidencia" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1`,
  `CREATE TABLE IF NOT EXISTS "EvidenciaVersion" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombreArchivo" VARCHAR(255) NOT NULL,
    "rutaArchivo" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100),
    "tamanoBytes" INTEGER,
    "subidoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenciaVersion_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EvidenciaVersion_evidenciaId_numero_key" ON "EvidenciaVersion"("evidenciaId", "numero")`,
  `CREATE INDEX IF NOT EXISTS "EvidenciaVersion_evidenciaId_idx" ON "EvidenciaVersion"("evidenciaId")`,
  `DO $$ BEGIN
    ALTER TABLE "EvidenciaVersion" ADD CONSTRAINT "EvidenciaVersion_evidenciaId_fkey"
      FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "EvidenciaVersion" ADD CONSTRAINT "EvidenciaVersion_subidoPorId_fkey"
      FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "carpeta" VARCHAR(150) NOT NULL DEFAULT 'general'`,
  `ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "nombreArchivo" VARCHAR(255)`,
  `ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "rutaArchivo" VARCHAR(500)`,
  `ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "mimeType" VARCHAR(100)`,
  `ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "aniosVigencia" INTEGER NOT NULL DEFAULT 7`,
  `ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `CREATE INDEX IF NOT EXISTS "AnexoVigencia_carpeta_idx" ON "AnexoVigencia"("carpeta")`,
  `CREATE TABLE IF NOT EXISTS "EvidenciaComentario" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "revisorId" TEXT,
    "autor" VARCHAR(255),
    "hunkId" VARCHAR(100),
    "anchor" VARCHAR(100),
    "quote" TEXT,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenciaComentario_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "EvidenciaComentario" ADD COLUMN IF NOT EXISTS "autor" VARCHAR(255)`,
  `CREATE INDEX IF NOT EXISTS "EvidenciaComentario_evidenciaId_numeroVersion_idx" ON "EvidenciaComentario"("evidenciaId", "numeroVersion")`,
  `DO $$ BEGIN
    ALTER TABLE "EvidenciaComentario" ADD CONSTRAINT "EvidenciaComentario_evidenciaId_fkey"
      FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

const ESTADOS_CANONICOS = ['Borrador', 'EnRevision', 'Validado', 'Rechazado'];

/**
 * Mapa documentado de estados legacy → canónicos (EstadoEvidencia).
 * QA: bases migradas de versiones previas conservan 'ConObservaciones'/'Cumple'.
 */
const MAPA_ESTADOS_LEGACY: Record<string, string> = {
  Cumple: 'Validado',
  Aprobado: 'Validado',
  Validada: 'Validado',
  ConObservaciones: 'Rechazado',
  NoCumple: 'Rechazado',
  EnCorreccion: 'Rechazado',
  Correccion: 'Rechazado',
  Rechazada: 'Rechazado',
  Pendiente: 'EnRevision',
  EnProceso: 'EnRevision',
  'EnRevisión': 'EnRevision',
};

const TABLAS_CON_ESTADO_EVIDENCIA = ['Evidencia', 'HistorialEvidencia'];

const PROGRAMAS_MINIMOS: [string, string, string, string, string][] = [
  ['prog-seed-der', 'Derecho', 'DER', 'Pregrado', 'Presencial'],
  ['prog-seed-ing-sis', 'Ingeniería de Sistemas', 'ING-SIS', 'Pregrado', 'Presencial'],
  ['prog-seed-adm', 'Administración de Empresas', 'ADM-EMP', 'Pregrado', 'Presencial'],
  ['prog-seed-psi', 'Psicología', 'PSI', 'Pregrado', 'Presencial'],
  ['prog-seed-enf', 'Enfermería', 'ENF', 'Pregrado', 'Presencial'],
];

async function normalizarEnumsYEstados(): Promise<void> {
  console.log('\nNormalizando enum EstadoEvidencia y datos legacy…\n');

  await prisma
    .$executeRawUnsafe(`ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'SuperAdmin'`)
    .catch((err) => {
      console.log(`· RolUsuario.SuperAdmin no aplicable: ${(err as Error).message}`);
    });

  for (const estado of ESTADOS_CANONICOS) {
    await prisma
      .$executeRawUnsafe(
        `ALTER TYPE "EstadoEvidencia" ADD VALUE IF NOT EXISTS '${estado}'`,
      )
      .catch((err) => {
        console.log(`· EstadoEvidencia.${estado} no aplicable: ${(err as Error).message}`);
      });
  }

  const labels = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'EstadoEvidencia'`,
  );
  const existentes = labels.map((fila) => fila.enumlabel);

  for (const [legacy, canonico] of Object.entries(MAPA_ESTADOS_LEGACY)) {
    if (!existentes.includes(legacy)) continue;
    const escapado = legacy.replace(/'/g, "''");
    for (const tabla of TABLAS_CON_ESTADO_EVIDENCIA) {
      try {
        const afectadas = await prisma.$executeRawUnsafe(
          `UPDATE "${tabla}" SET "estado" = '${canonico}'::"EstadoEvidencia" WHERE "estado"::text = '${escapado}'`,
        );
        if (Number(afectadas) > 0) {
          console.log(`✓ ${tabla}.estado '${legacy}' → '${canonico}' (${afectadas} filas)`);
        }
      } catch (err) {
        console.log(`· ${tabla}.estado '${legacy}': ${(err as Error).message}`);
      }
    }
  }
}

async function sembrarProgramasMinimos(): Promise<void> {
  console.log('\nGarantizando catálogo mínimo de programas…\n');
  for (const [id, nombre, codigo, nivel, modalidad] of PROGRAMAS_MINIMOS) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Programa" ("id","nombre","codigo","nivel","modalidad","semaforo","porcentajeAvance","estadoProceso","origenDato","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'Verde',0,'En curso','Manual',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        id,
        nombre,
        codigo,
        nivel,
        modalidad,
      );
      console.log(`✓ Programa ${nombre} (${codigo})`);
    } catch (err) {
      console.log(`· Programa ${codigo}: ${(err as Error).message}`);
    }
  }
}

async function main() {
  console.log('Aplicando esquema de versionado documental...\n');

  for (const sql of SENTENCIAS) {
    const resumen = sql.slice(0, 60).replace(/\s+/g, ' ');
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✓ ${resumen}…`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        console.log(`· ${resumen}… (ya existía)`);
        continue;
      }
      throw err;
    }
  }

  await normalizarEnumsYEstados();
  await sembrarProgramasMinimos();

  console.log('\nListo. Ejecute: pnpm prisma:verify && pnpm prisma:seed');
}

main()
  .catch((err) => {
    console.error('Error aplicando esquema:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
