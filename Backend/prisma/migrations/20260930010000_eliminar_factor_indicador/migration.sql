-- Plantillas sin guía: se asigna la guía G1–G4 más cercana antes de exigirla.
UPDATE "Plantilla"
SET "codigoGuia" = CASE
  WHEN "esGuiaDocumentoMaestro" AND "categoria" = 'Institucional' THEN 'G3'::"CodigoDocumentoGuia"
  WHEN "esGuiaDocumentoMaestro" THEN 'G1'::"CodigoDocumentoGuia"
  WHEN "categoria" = 'Institucional' THEN 'G4'::"CodigoDocumentoGuia"
  ELSE 'G2'::"CodigoDocumentoGuia"
END
WHERE "codigoGuia" IS NULL;

-- AlterTable
ALTER TABLE "Plantilla" ALTER COLUMN "codigoGuia" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "Evidencia_factor_indicador_periodo_idx";

-- DropIndex
DROP INDEX IF EXISTS "Plantilla_factor_vigente_idx";

-- AlterTable
ALTER TABLE "Evidencia" DROP COLUMN "factor",
DROP COLUMN "indicador";

-- AlterTable
ALTER TABLE "Plantilla" DROP COLUMN "factor";

-- CreateIndex
CREATE INDEX "Evidencia_codigoGuia_periodo_idx" ON "Evidencia"("codigoGuia", "periodo");

-- CreateIndex
CREATE INDEX "Evidencia_programaId_codigoGuia_idx" ON "Evidencia"("programaId", "codigoGuia");

-- CreateIndex
CREATE INDEX "Plantilla_codigoGuia_tipoTramite_vigente_idx" ON "Plantilla"("codigoGuia", "tipoTramite", "vigente");
