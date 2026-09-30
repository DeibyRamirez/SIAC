-- CreateTable
CREATE TABLE "Institucion" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "tipoTramiteActivo" "TipoTramiteSIAC" NOT NULL DEFAULT 'CondicionesInstitucionalesNuevas',
    "fechaResolucion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_codigo_key" ON "Institucion"("codigo");

-- AlterTable
ALTER TABLE "Programa" ADD COLUMN "fechaResolucion" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Evidencia" ADD COLUMN "institucionId" TEXT,
ALTER COLUMN "programaId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TramiteDocumentoGuia" ADD COLUMN "pesoPorcentaje" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE INDEX "Evidencia_institucionId_idx" ON "Evidencia"("institucionId");

-- AddForeignKey
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Institución singleton CUAC
INSERT INTO "Institucion" ("id", "nombre", "codigo", "tipoTramiteActivo", "updatedAt")
VALUES ('inst-cuac', 'Corporación Universitaria Autónoma del Cauca', 'CUAC', 'CondicionesInstitucionalesNuevas', CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;

-- Migrar evidencias G3/G4 a institución
UPDATE "Evidencia"
SET "institucionId" = 'inst-cuac', "programaId" = NULL
WHERE "codigoGuia" IN ('G3', 'G4') AND "institucionId" IS NULL;

-- Pesos T-010 por trámite
UPDATE "TramiteDocumentoGuia" tdg
SET "pesoPorcentaje" = sub.peso
FROM (
  SELECT tdg2.id,
    CASE
      WHEN t.tipo = 'RegistroCalificadoNuevo' AND tdg2."codigoGuia" = 'G1' THEN 100
      WHEN t.tipo = 'RenovacionRegistroCalificado' AND tdg2."codigoGuia" = 'G1' THEN 90
      WHEN t.tipo = 'RenovacionRegistroCalificado' AND tdg2."codigoGuia" = 'G2' THEN 10
      WHEN t.tipo = 'CondicionesInstitucionalesNuevas' AND tdg2."codigoGuia" = 'G3' THEN 100
      WHEN t.tipo = 'RenovacionCondicionesInstitucionales' AND tdg2."codigoGuia" = 'G3' THEN 85
      WHEN t.tipo = 'RenovacionCondicionesInstitucionales' AND tdg2."codigoGuia" = 'G4' THEN 15
      ELSE 100
    END AS peso
  FROM "TramiteDocumentoGuia" tdg2
  JOIN "TramiteSIAC" t ON t.id = tdg2."tramiteId"
) sub
WHERE tdg.id = sub.id;
