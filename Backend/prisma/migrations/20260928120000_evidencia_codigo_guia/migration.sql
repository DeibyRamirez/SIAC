-- CreateEnum
CREATE TYPE "CodigoCondicionInstitucional" AS ENUM (
  'SeleccionEvaluacionEstudiantesProfesores',
  'EstructuraAdministrativaAcademica',
  'CulturaAutoevaluacion',
  'ProgramaEgresados',
  'ModeloBienestar',
  'RecursosSuficientes'
);

-- AlterTable
ALTER TABLE "Evidencia" ADD COLUMN "codigoGuia" "CodigoDocumentoGuia";

-- CreateTable
CREATE TABLE "EvaluacionCondicionInstitucionalEvidencia" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "numeroRevision" INTEGER NOT NULL,
    "codigoCondicion" "CodigoCondicionInstitucional" NOT NULL,
    "cumple" BOOLEAN NOT NULL,
    "observacion" TEXT,
    "revisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluacionCondicionInstitucionalEvidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluacionCondicionInstitucionalEvidencia_evidenciaId_idx" ON "EvaluacionCondicionInstitucionalEvidencia"("evidenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionCondicionInstitucionalEvidencia_evidenciaId_numeroRevision_codigoCondicion_key" ON "EvaluacionCondicionInstitucionalEvidencia"("evidenciaId", "numeroRevision", "codigoCondicion");

-- AddForeignKey
ALTER TABLE "EvaluacionCondicionInstitucionalEvidencia" ADD CONSTRAINT "EvaluacionCondicionInstitucionalEvidencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
