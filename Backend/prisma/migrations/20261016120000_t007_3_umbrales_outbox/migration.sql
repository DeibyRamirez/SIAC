-- T-007.3a/T-007.3c — umbrales de vigencia (PO 13/10: aviso 24 meses, rojo 18 meses) y outbox de
-- correo idempotente (C-4: NotificacionSalida + AlertaInApp.claveEvento).
-- Migración creada con `pnpm prisma migrate diff` (migrate dev --create-only no se ejecutó para no
-- tocar la BD compartida; la aplica el líder técnico con `prisma migrate deploy`).
-- SQL solo aditivo: CREATE TYPE/TABLE/INDEX + ADD COLUMN nullable o con default; sin DROP ni RENAME.

-- CreateEnum
CREATE TYPE "EstadoNotificacionSalida" AS ENUM ('Pendiente', 'Enviado', 'Fallido', 'Descartado');

-- AlterTable
ALTER TABLE "AlertaInApp" ADD COLUMN     "claveEvento" TEXT;

-- AlterTable
ALTER TABLE "ConfiguracionSIAC" ADD COLUMN     "mesesRojoVigencia" INTEGER NOT NULL DEFAULT 18,
ALTER COLUMN "mesesAvisoVigencia" SET DEFAULT 24;

-- Actualiza la fila existente 'global' solo si conserva el valor anterior (12) y sin tocar otros
-- campos: el ADD COLUMN ya deja mesesRojoVigencia = 18 en las filas existentes.
UPDATE "ConfiguracionSIAC"
SET "mesesAvisoVigencia" = 24
WHERE "id" = 'global' AND "mesesAvisoVigencia" = 12;

-- CreateTable
CREATE TABLE "NotificacionSalida" (
    "id" TEXT NOT NULL,
    "claveEvento" TEXT NOT NULL,
    "usuarioId" TEXT,
    "destinatarioCorreo" TEXT,
    "canal" TEXT NOT NULL DEFAULT 'correo',
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" "EstadoNotificacionSalida" NOT NULL DEFAULT 'Pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,
    "proximoIntentoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificacionSalida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionSalida_claveEvento_key" ON "NotificacionSalida"("claveEvento");

-- CreateIndex
CREATE INDEX "NotificacionSalida_estado_proximoIntentoAt_idx" ON "NotificacionSalida"("estado", "proximoIntentoAt");

-- CreateIndex
CREATE INDEX "NotificacionSalida_usuarioId_idx" ON "NotificacionSalida"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertaInApp_claveEvento_key" ON "AlertaInApp"("claveEvento");

-- AddForeignKey
ALTER TABLE "NotificacionSalida" ADD CONSTRAINT "NotificacionSalida_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
