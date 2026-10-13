-- S3-03 / HU-009: registros por categoría (una fila por entidad) e ingestas reemplazables

-- CreateTable
CREATE TABLE "RegistroEstudiante" (
    "id" TEXT NOT NULL,
    "nombreEstudiante" TEXT,
    "programa" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "semestre" INTEGER NOT NULL,
    "estrato" INTEGER NOT NULL,
    "codigoEstudiante" TEXT NOT NULL,
    "periodoAcademico" TEXT NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroEstudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroProfesor" (
    "id" TEXT NOT NULL,
    "nombreProfesor" TEXT,
    "programa" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "periodoInicio" TEXT NOT NULL,
    "periodoFinal" TEXT,
    "periodoAcademico" TEXT NOT NULL,
    "estrato" INTEGER NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroProfesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroEgresado" (
    "id" TEXT NOT NULL,
    "nombreEgresado" TEXT,
    "programa" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "graduadosPeriodo" TEXT NOT NULL,
    "estrato" INTEGER NOT NULL,
    "grado" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroEgresado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroSemillero" (
    "id" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "grupoInvestigacion" TEXT NOT NULL,
    "semillero" TEXT NOT NULL,
    "periodoAcademico" TEXT NOT NULL,
    "cantidadEstudiantes" INTEGER NOT NULL,
    "genero" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroSemillero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramaAseguramiento" (
    "id" TEXT NOT NULL,
    "periodoAcademico" TEXT NOT NULL,
    "programas" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "grado" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "acreditados" INTEGER NOT NULL DEFAULT 0,
    "acreditables" INTEGER NOT NULL DEFAULT 0,
    "registrosCalificables" INTEGER NOT NULL DEFAULT 0,
    "inicioSiac" TIMESTAMP(3) NOT NULL,
    "finalizacionSiac" TIMESTAMP(3) NOT NULL,
    "snies" TEXT NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramaAseguramiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SedeInfraestructura" (
    "id" TEXT NOT NULL,
    "sede" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "numeroPisos" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "totalM2AreaConstruida" DECIMAL(12,2) NOT NULL,
    "totalM2AreaTerreno" DECIMAL(12,2) NOT NULL,
    "cantidadSalonesClase" INTEGER NOT NULL,
    "areaM2SalonClase" DECIMAL(12,2) NOT NULL,
    "cantidadSalasSistemas" INTEGER NOT NULL,
    "areaM2SalasSistemas" DECIMAL(12,2) NOT NULL,
    "cantidadLaboratorios" INTEGER NOT NULL,
    "areaM2Laboratorios" DECIMAL(12,2) NOT NULL,
    "cantidadAuditorios" INTEGER NOT NULL,
    "areaM2Auditorios" DECIMAL(12,2) NOT NULL,
    "cantidadSalasLectura" INTEGER NOT NULL,
    "areaM2SalasLectura" DECIMAL(12,2) NOT NULL,
    "cantidadZonasDeportivas" INTEGER NOT NULL,
    "areaM2ZonasDeportivas" DECIMAL(12,2) NOT NULL,
    "cantidadCafeterias" INTEGER NOT NULL,
    "cantidadZonasEstudio" INTEGER NOT NULL,
    "cantidadZonasRecreativas" INTEGER NOT NULL,
    "cargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SedeInfraestructura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroEstudiante_periodoAcademico_facultad_programa_idx" ON "RegistroEstudiante"("periodoAcademico", "facultad", "programa");

-- CreateIndex
CREATE INDEX "RegistroEstudiante_cargaId_idx" ON "RegistroEstudiante"("cargaId");

-- CreateIndex
CREATE INDEX "RegistroProfesor_periodoAcademico_facultad_programa_idx" ON "RegistroProfesor"("periodoAcademico", "facultad", "programa");

-- CreateIndex
CREATE INDEX "RegistroProfesor_cargaId_idx" ON "RegistroProfesor"("cargaId");

-- CreateIndex
CREATE INDEX "RegistroEgresado_graduadosPeriodo_facultad_programa_idx" ON "RegistroEgresado"("graduadosPeriodo", "facultad", "programa");

-- CreateIndex
CREATE INDEX "RegistroEgresado_cargaId_idx" ON "RegistroEgresado"("cargaId");

-- CreateIndex
CREATE INDEX "RegistroSemillero_periodoAcademico_facultad_programa_idx" ON "RegistroSemillero"("periodoAcademico", "facultad", "programa");

-- CreateIndex
CREATE INDEX "RegistroSemillero_cargaId_idx" ON "RegistroSemillero"("cargaId");

-- CreateIndex
CREATE INDEX "ProgramaAseguramiento_periodoAcademico_facultad_idx" ON "ProgramaAseguramiento"("periodoAcademico", "facultad");

-- CreateIndex
CREATE INDEX "ProgramaAseguramiento_cargaId_idx" ON "ProgramaAseguramiento"("cargaId");

-- CreateIndex
CREATE INDEX "SedeInfraestructura_sede_idx" ON "SedeInfraestructura"("sede");

-- CreateIndex
CREATE INDEX "SedeInfraestructura_cargaId_idx" ON "SedeInfraestructura"("cargaId");

-- AddForeignKey
ALTER TABLE "RegistroEstudiante" ADD CONSTRAINT "RegistroEstudiante_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroProfesor" ADD CONSTRAINT "RegistroProfesor_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEgresado" ADD CONSTRAINT "RegistroEgresado_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSemillero" ADD CONSTRAINT "RegistroSemillero_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramaAseguramiento" ADD CONSTRAINT "ProgramaAseguramiento_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SedeInfraestructura" ADD CONSTRAINT "SedeInfraestructura_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
