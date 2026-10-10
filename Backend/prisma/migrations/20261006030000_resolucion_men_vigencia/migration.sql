-- Decisión del PO (06/10): la vigencia inicia con la resolución MEN real (reemplaza «activar vigencia»).
-- Tipo de evidencia «ResolucionMen» (única excepción a la regla .docx: solo PDF real) y tabla con número,
-- fecha real y propietario (programa o institución). Cada trámite queda marcado como cerrado por resolución.

-- CreateEnum
CREATE TYPE "TipoEvidencia" AS ENUM ('DocumentoGuia', 'ResolucionMen');

-- AlterTable
ALTER TABLE "Evidencia" ADD COLUMN     "tipoEvidencia" "TipoEvidencia" NOT NULL DEFAULT 'DocumentoGuia';

-- AlterTable
ALTER TABLE "TramiteSIAC" ADD COLUMN     "requiereResolucionMen" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ResolucionMen" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "numero" VARCHAR(60) NOT NULL,
    "fechaResolucion" DATE NOT NULL,
    "tipoTramite" "TipoTramiteSIAC" NOT NULL,
    "programaId" TEXT,
    "institucionId" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolucionMen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResolucionMen_evidenciaId_key" ON "ResolucionMen"("evidenciaId");

-- CreateIndex
CREATE INDEX "ResolucionMen_programaId_fechaResolucion_idx" ON "ResolucionMen"("programaId", "fechaResolucion");

-- CreateIndex
CREATE INDEX "ResolucionMen_institucionId_fechaResolucion_idx" ON "ResolucionMen"("institucionId", "fechaResolucion");

-- AddForeignKey
ALTER TABLE "ResolucionMen" ADD CONSTRAINT "ResolucionMen_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolucionMen" ADD CONSTRAINT "ResolucionMen_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolucionMen" ADD CONSTRAINT "ResolucionMen_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolucionMen" ADD CONSTRAINT "ResolucionMen_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Exactamente un propietario por resolución (Prisma no modela CHECK; documentado en schema.prisma).
ALTER TABLE "ResolucionMen" ADD CONSTRAINT "ResolucionMen_un_propietario_chk" CHECK (num_nonnulls("programaId", "institucionId") = 1);
