-- HU-008 T-008.1 (R-008.1a): alinear el historial de migraciones con schema.prisma sin pérdida de datos.
-- La tabla EvidenciaComentario existe en schema.prisma y la usa evidencia.repositorio.ts, pero ninguna
-- migración la creaba (en Supabase pudo crearse con db push). Todo es idempotente: si ya existe, no se toca.

CREATE TABLE IF NOT EXISTS "EvidenciaComentario" (
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
);

CREATE INDEX IF NOT EXISTS "EvidenciaComentario_evidenciaId_numeroVersion_idx"
ON "EvidenciaComentario"("evidenciaId", "numeroVersion");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EvidenciaComentario_evidenciaId_fkey'
  ) THEN
    ALTER TABLE "EvidenciaComentario"
      ADD CONSTRAINT "EvidenciaComentario_evidenciaId_fkey"
      FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
