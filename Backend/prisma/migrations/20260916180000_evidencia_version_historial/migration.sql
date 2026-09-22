-- EvidenciaVersion: historial de archivos por evidencia
CREATE TABLE IF NOT EXISTS "EvidenciaVersion" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "EvidenciaVersion_evidenciaId_numero_key" ON "EvidenciaVersion"("evidenciaId", "numero");
CREATE INDEX IF NOT EXISTS "EvidenciaVersion_evidenciaId_idx" ON "EvidenciaVersion"("evidenciaId");

DO $$ BEGIN
  ALTER TABLE "EvidenciaVersion" ADD CONSTRAINT "EvidenciaVersion_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EvidenciaVersion" ADD CONSTRAINT "EvidenciaVersion_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AnexoVigencia: documentos institucionales con archivo y vigencia calculada
ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "carpeta" VARCHAR(150) NOT NULL DEFAULT 'general';
ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "nombreArchivo" VARCHAR(255);
ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "rutaArchivo" VARCHAR(500);
ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "mimeType" VARCHAR(100);
ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "aniosVigencia" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "AnexoVigencia" ADD COLUMN IF NOT EXISTS "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AnexoVigencia_carpeta_idx" ON "AnexoVigencia"("carpeta");
