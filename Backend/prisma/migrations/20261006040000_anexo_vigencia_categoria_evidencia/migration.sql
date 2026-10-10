-- Decisión del PO (06/10), bloque 6 y R-D: categoría explícita para RN-003, vínculo con la evidencia
-- que respalda el anexo y fecha de expedición del certificado.
-- Esta migración NO borra datos. Las filas sin documento se eliminan antes con el script explícito
-- `pnpm datos:limpiar-anexos-sin-documento -- --ejecutar` (ver docs/manuales/manual-tecnico.md).

-- CreateEnum
CREATE TYPE "CategoriaAnexo" AS ENUM ('Infraestructura', 'Permiso', 'Convenio', 'Otro');

-- AlterTable
ALTER TABLE "AnexoVigencia" ADD COLUMN     "categoria" "CategoriaAnexo" NOT NULL DEFAULT 'Otro',
ADD COLUMN     "evidenciaId" TEXT,
ADD COLUMN     "fechaExpedicion" DATE;

-- CreateIndex
CREATE INDEX "AnexoVigencia_categoria_fechaVencimiento_idx" ON "AnexoVigencia"("categoria", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "AnexoVigencia_evidenciaId_idx" ON "AnexoVigencia"("evidenciaId");

-- AddForeignKey
ALTER TABLE "AnexoVigencia" ADD CONSTRAINT "AnexoVigencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Las filas existentes cuyo tipo libre mencionaba infraestructura pasan a la categoría explícita.
UPDATE "AnexoVigencia" SET "categoria" = 'Infraestructura' WHERE "tipo" ILIKE '%infraestructura%';

-- Todo anexo nuevo (o modificado) debe tener documento archivado y evidencia vinculada.
-- NOT VALID: no se revalidan las filas históricas (Prisma no modela CHECK; documentado en schema.prisma).
ALTER TABLE "AnexoVigencia" ADD CONSTRAINT "AnexoVigencia_documento_y_evidencia_chk"
  CHECK ("rutaArchivo" IS NOT NULL AND "rutaArchivo" <> '' AND "evidenciaId" IS NOT NULL) NOT VALID;
