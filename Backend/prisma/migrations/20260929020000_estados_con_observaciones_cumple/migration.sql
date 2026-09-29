-- HU-003 (D1): estados nuevos del checklist y puntaje entero n/9 (n/6 en G3).
-- Los valores nuevos del enum van en una migración propia: PostgreSQL no permite usar
-- un valor recién agregado dentro de la misma transacción. El mapeo de datos está en
-- 20260929030000_mapear_estados_puntaje_n9.

-- AlterEnum
ALTER TYPE "EstadoEvidencia" ADD VALUE IF NOT EXISTS 'ConObservaciones';
ALTER TYPE "EstadoEvidencia" ADD VALUE IF NOT EXISTS 'Cumple';

-- AlterTable
ALTER TABLE "Evidencia" ADD COLUMN "puntajeActual" INTEGER;
ALTER TABLE "Evidencia" ADD COLUMN "totalCondicionesActual" INTEGER;

-- CreateIndex
CREATE INDEX "Evidencia_puntajeActual_idx" ON "Evidencia"("puntajeActual");
