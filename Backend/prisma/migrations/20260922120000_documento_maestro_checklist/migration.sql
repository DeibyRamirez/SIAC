-- CreateEnum
CREATE TYPE "TipoTramitePlantilla" AS ENUM ('Renovacion', 'NuevoPrograma', 'General');

-- CreateEnum
CREATE TYPE "CodigoCondicionDocumentoMaestro" AS ENUM ('Denominacion', 'Justificacion', 'AspectosCurriculares', 'OrganizacionActividades', 'InvestigacionInnovacion', 'RelacionSectorExterno', 'Profesores', 'MediosEducativos', 'Infraestructura');

-- AlterTable
ALTER TABLE "Plantilla" ADD COLUMN "tipoTramite" "TipoTramitePlantilla" NOT NULL DEFAULT 'General';
ALTER TABLE "Plantilla" ADD COLUMN "esGuiaDocumentoMaestro" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DocumentoRequerido" ADD COLUMN "requiereChecklistMaestro" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Evidencia" ADD COLUMN "documentoRequeridoId" TEXT;
ALTER TABLE "Evidencia" ADD COLUMN "porcentajeCompletitud" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Evidencia" ADD COLUMN "requiereChecklistMaestro" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EvaluacionCondicionEvidencia" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "numeroRevision" INTEGER NOT NULL,
    "codigoCondicion" "CodigoCondicionDocumentoMaestro" NOT NULL,
    "cumple" BOOLEAN NOT NULL,
    "observacion" TEXT,
    "revisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluacionCondicionEvidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plantilla_categoria_tipoTramite_idx" ON "Plantilla"("categoria", "tipoTramite");

-- CreateIndex
CREATE INDEX "Evidencia_documentoRequeridoId_idx" ON "Evidencia"("documentoRequeridoId");

-- CreateIndex
CREATE INDEX "EvaluacionCondicionEvidencia_evidenciaId_idx" ON "EvaluacionCondicionEvidencia"("evidenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionCondicionEvidencia_evidenciaId_numeroRevision_codigoCondicion_key" ON "EvaluacionCondicionEvidencia"("evidenciaId", "numeroRevision", "codigoCondicion");

-- AddForeignKey
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_documentoRequeridoId_fkey" FOREIGN KEY ("documentoRequeridoId") REFERENCES "DocumentoRequerido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionCondicionEvidencia" ADD CONSTRAINT "EvaluacionCondicionEvidencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
