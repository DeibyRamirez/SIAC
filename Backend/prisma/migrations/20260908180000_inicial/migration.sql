-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('Cargador', 'Revisor', 'Administrador');
CREATE TYPE "EstadoEvidencia" AS ENUM ('Borrador', 'EnRevision', 'Validado', 'Rechazado');
CREATE TYPE "EstadoVigencia" AS ENUM ('Vigente', 'Proximo', 'Vencido');
CREATE TYPE "FormatoArchivo" AS ENUM ('PDF', 'DOCX', 'XLSX');
CREATE TYPE "CategoriaPlantilla" AS ENUM ('Institucional', 'Programa', 'Autoevaluacion');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Programa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "semaforo" TEXT NOT NULL DEFAULT 'Verde',
    "porcentajeAvance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estadoProceso" TEXT NOT NULL DEFAULT 'En curso',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Evidencia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'Borrador',
    "autorId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT,
    "mimeType" TEXT,
    "tamanoBytes" INTEGER,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "responsable" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Evidencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistorialEvidencia" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "estado" "EstadoEvidencia" NOT NULL,
    "observacion" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistorialEvidencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plantilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "formato" "FormatoArchivo" NOT NULL,
    "version" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "categoria" "CategoriaPlantilla" NOT NULL,
    "descripcion" TEXT,
    "nombreArchivo" TEXT,
    "rutaArchivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnexoVigencia" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoVigencia" NOT NULL DEFAULT 'Vigente',
    "responsable" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnexoVigencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertaInApp" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertaInApp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EtapaAcreditacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EtapaAcreditacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarpetaNormativa" (
    "id" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "condicionId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CarpetaNormativa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentoRequerido" (
    "id" TEXT NOT NULL,
    "carpetaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPlantilla" BOOLEAN NOT NULL DEFAULT false,
    "formato" "FormatoArchivo" NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentoRequerido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");
CREATE UNIQUE INDEX "Programa_codigo_key" ON "Programa"("codigo");
CREATE INDEX "Evidencia_programaId_idx" ON "Evidencia"("programaId");
CREATE INDEX "Evidencia_autorId_idx" ON "Evidencia"("autorId");
CREATE INDEX "Evidencia_estado_idx" ON "Evidencia"("estado");
CREATE INDEX "Evidencia_factor_indicador_periodo_idx" ON "Evidencia"("factor", "indicador", "periodo");
CREATE INDEX "Plantilla_factor_vigente_idx" ON "Plantilla"("factor", "vigente");
CREATE INDEX "AnexoVigencia_programaId_idx" ON "AnexoVigencia"("programaId");
CREATE INDEX "AnexoVigencia_fechaVencimiento_idx" ON "AnexoVigencia"("fechaVencimiento");
CREATE INDEX "AlertaInApp_usuarioId_leida_idx" ON "AlertaInApp"("usuarioId", "leida");

-- AddForeignKey
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistorialEvidencia" ADD CONSTRAINT "HistorialEvidencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "Evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnexoVigencia" ADD CONSTRAINT "AnexoVigencia_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertaInApp" ADD CONSTRAINT "AlertaInApp_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarpetaNormativa" ADD CONSTRAINT "CarpetaNormativa_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "EtapaAcreditacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoRequerido" ADD CONSTRAINT "DocumentoRequerido_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "CarpetaNormativa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
