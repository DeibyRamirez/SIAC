-- HU-009: cifras institucionales (variables, cargas y valores por periodo)

-- CreateEnum
CREATE TYPE "FuenteCifra" AS ENUM ('API', 'EXCEL', 'SEMILLA');

-- CreateTable
CREATE TABLE "VariableCifra" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiquetaCuac" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad" TEXT NOT NULL DEFAULT 'conteo',
    "dimensiones" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableCifra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaCifras" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "fuente" "FuenteCifra" NOT NULL,
    "nombreArchivo" TEXT,
    "filasOk" INTEGER NOT NULL,
    "filasError" INTEGER NOT NULL,
    "errores" JSONB,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargaCifras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraIndicador" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "variableId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "facultad" TEXT,
    "programaId" TEXT,
    "sede" TEXT,
    "dimension" TEXT,
    "valorDimension" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "fuente" "FuenteCifra" NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraIndicador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VariableCifra_categoriaId_activo_idx" ON "VariableCifra"("categoriaId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "VariableCifra_categoriaId_clave_key" ON "VariableCifra"("categoriaId", "clave");

-- CreateIndex
CREATE INDEX "CargaCifras_categoriaId_createdAt_idx" ON "CargaCifras"("categoriaId", "createdAt");

-- CreateIndex
CREATE INDEX "CifraIndicador_categoriaId_periodo_idx" ON "CifraIndicador"("categoriaId", "periodo");

-- CreateIndex
CREATE INDEX "CifraIndicador_variableId_periodo_idx" ON "CifraIndicador"("variableId", "periodo");

-- CreateIndex
CREATE INDEX "CifraIndicador_cargaId_idx" ON "CifraIndicador"("cargaId");

-- CreateIndex
CREATE INDEX "CifraIndicador_programaId_idx" ON "CifraIndicador"("programaId");

-- AddForeignKey
ALTER TABLE "CifraIndicador" ADD CONSTRAINT "CifraIndicador_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "VariableCifra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraIndicador" ADD CONSTRAINT "CifraIndicador_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraIndicador" ADD CONSTRAINT "CifraIndicador_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
