-- CreateEnum
CREATE TYPE "OrigenDato" AS ENUM ('API', 'CSV', 'Manual');

-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'ParAcademico';

-- AlterTable Usuario
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "codigoInstitucional" VARCHAR(50);
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "cargo" VARCHAR(150);
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "dependencia" VARCHAR(150);
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "idExterno" VARCHAR(100);
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "origenDato" "OrigenDato" NOT NULL DEFAULT 'Manual';
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3);

-- AlterTable Programa
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "codigoSnies" VARCHAR(20);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "modalidad" VARCHAR(50);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "duracionSemestres" INTEGER;
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "idExterno" VARCHAR(100);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "origenDato" "OrigenDato" NOT NULL DEFAULT 'Manual';
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "fechaSincronizacion" TIMESTAMP(3);

-- CreateTable UsuarioPrograma (si no existe)
CREATE TABLE IF NOT EXISTS "UsuarioPrograma" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsuarioPrograma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_idExterno_key" ON "Usuario"("idExterno");
CREATE UNIQUE INDEX IF NOT EXISTS "Programa_idExterno_key" ON "Programa"("idExterno");
CREATE INDEX IF NOT EXISTS "UsuarioPrograma_usuarioId_idx" ON "UsuarioPrograma"("usuarioId");
CREATE INDEX IF NOT EXISTS "UsuarioPrograma_programaId_idx" ON "UsuarioPrograma"("programaId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "UsuarioPrograma" ADD CONSTRAINT "UsuarioPrograma_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsuarioPrograma" ADD CONSTRAINT "UsuarioPrograma_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
