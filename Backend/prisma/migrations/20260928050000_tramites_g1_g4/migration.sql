-- CreateEnum
CREATE TYPE "CodigoDocumentoGuia" AS ENUM ('G1', 'G2', 'G3', 'G4');

-- CreateEnum
CREATE TYPE "TipoTramiteSIAC" AS ENUM ('RegistroCalificadoNuevo', 'RenovacionRegistroCalificado', 'CondicionesInstitucionalesNuevas', 'RenovacionCondicionesInstitucionales');

-- CreateEnum
CREATE TYPE "AlcanceTramiteSIAC" AS ENUM ('Programa', 'Institucion');

-- AlterTable
ALTER TABLE "Programa" ADD COLUMN "tipoTramiteActivo" "TipoTramiteSIAC" NOT NULL DEFAULT 'RenovacionRegistroCalificado';

-- AlterTable
ALTER TABLE "Plantilla" ADD COLUMN "codigoGuia" "CodigoDocumentoGuia";

-- AlterTable
ALTER TABLE "DocumentoRequerido" ADD COLUMN "codigoGuia" "CodigoDocumentoGuia";

-- CreateTable
CREATE TABLE "TramiteSIAC" (
    "id" TEXT NOT NULL,
    "tipo" "TipoTramiteSIAC" NOT NULL,
    "alcance" "AlcanceTramiteSIAC" NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TramiteSIAC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TramiteDocumentoGuia" (
    "id" TEXT NOT NULL,
    "tramiteId" TEXT NOT NULL,
    "codigoGuia" "CodigoDocumentoGuia" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TramiteDocumentoGuia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TramiteSIAC_tipo_key" ON "TramiteSIAC"("tipo");

-- CreateIndex
CREATE INDEX "TramiteDocumentoGuia_tramiteId_idx" ON "TramiteDocumentoGuia"("tramiteId");

-- CreateIndex
CREATE UNIQUE INDEX "TramiteDocumentoGuia_tramiteId_codigoGuia_key" ON "TramiteDocumentoGuia"("tramiteId", "codigoGuia");

-- AddForeignKey
ALTER TABLE "TramiteDocumentoGuia" ADD CONSTRAINT "TramiteDocumentoGuia_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "TramiteSIAC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
