-- AlterTable: versionado de evidencias
ALTER TABLE "Evidencia" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
