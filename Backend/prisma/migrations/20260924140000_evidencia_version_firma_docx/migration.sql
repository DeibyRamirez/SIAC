-- AlterTable
ALTER TABLE "EvidenciaVersion" ADD COLUMN "firmaDescarga" VARCHAR(500),
ADD COLUMN "textoBaseAuditoria" TEXT;

-- CreateIndex
CREATE INDEX "HistorialEvidencia_actorId_createdAt_idx" ON "HistorialEvidencia"("actorId", "createdAt");
