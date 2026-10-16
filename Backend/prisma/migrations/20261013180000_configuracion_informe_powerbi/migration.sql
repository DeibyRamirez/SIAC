-- CreateTable
CREATE TABLE "ConfiguracionInformePowerBi" (
    "categoriaId" VARCHAR(64) NOT NULL,
    "urlPublica" TEXT NOT NULL,
    "urlHash" VARCHAR(64) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "actualizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionInformePowerBi_pkey" PRIMARY KEY ("categoriaId")
);
