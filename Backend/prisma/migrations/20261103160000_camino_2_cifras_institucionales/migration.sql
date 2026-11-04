-- CreateTable
CREATE TABLE "Integrador" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "hashClave" CHAR(64) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoUsoEn" TIMESTAMP(3),
    "revocadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraEstudiante" (
    "id" TEXT NOT NULL,
    "nombreEstudiante" VARCHAR(300),
    "programa" VARCHAR(300) NOT NULL,
    "genero" VARCHAR(20) NOT NULL,
    "facultad" VARCHAR(300) NOT NULL,
    "semestre" INTEGER NOT NULL,
    "estrato" INTEGER NOT NULL,
    "valorDimension" INTEGER NOT NULL,
    "codigoEstudiante" VARCHAR(40) NOT NULL,
    "periodoAcademico" VARCHAR(16) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraEstudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraProfesor" (
    "id" TEXT NOT NULL,
    "nombreProfesor" VARCHAR(300),
    "programa" VARCHAR(300) NOT NULL,
    "genero" VARCHAR(20) NOT NULL,
    "facultad" VARCHAR(300) NOT NULL,
    "periodoInicio" VARCHAR(16) NOT NULL,
    "periodoFinal" VARCHAR(16),
    "periodoAcademico" VARCHAR(16) NOT NULL,
    "estrato" INTEGER NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraProfesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraEgresado" (
    "id" TEXT NOT NULL,
    "nombreEgresado" VARCHAR(300),
    "programa" VARCHAR(300) NOT NULL,
    "genero" VARCHAR(20) NOT NULL,
    "facultad" VARCHAR(300) NOT NULL,
    "graduadosPeriodo" VARCHAR(16) NOT NULL,
    "estrato" INTEGER NOT NULL,
    "grado" VARCHAR(40) NOT NULL,
    "nivel" VARCHAR(20) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraEgresado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraInvestigacion" (
    "id" TEXT NOT NULL,
    "facultad" VARCHAR(300) NOT NULL,
    "grupoInvestigacion" VARCHAR(300) NOT NULL,
    "semillero" VARCHAR(300) NOT NULL,
    "periodoAcademico" VARCHAR(16) NOT NULL,
    "cantidadEstudiantes" INTEGER NOT NULL,
    "genero" VARCHAR(20) NOT NULL,
    "programa" VARCHAR(300) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraInvestigacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraAseguramiento" (
    "id" TEXT NOT NULL,
    "periodoAcademico" VARCHAR(16) NOT NULL,
    "programas" VARCHAR(300) NOT NULL,
    "facultad" VARCHAR(300) NOT NULL,
    "grado" VARCHAR(40) NOT NULL,
    "nivel" VARCHAR(20) NOT NULL,
    "acreditados" INTEGER NOT NULL,
    "acreditables" INTEGER NOT NULL,
    "registrosCalificables" INTEGER NOT NULL,
    "inicioSiac" DATE NOT NULL,
    "finalizacionSiac" DATE NOT NULL,
    "snies" VARCHAR(40) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraAseguramiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraInfraestructura" (
    "id" TEXT NOT NULL,
    "sede" VARCHAR(200) NOT NULL,
    "direccion" VARCHAR(400) NOT NULL,
    "numeroPisos" INTEGER NOT NULL,
    "estado" VARCHAR(80) NOT NULL,
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
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraInfraestructura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraBienestar" (
    "id" TEXT NOT NULL,
    "clave" VARCHAR(120) NOT NULL,
    "periodo" VARCHAR(16) NOT NULL,
    "facultad" VARCHAR(300),
    "dimension" VARCHAR(120),
    "valorDimension" VARCHAR(200),
    "valor" DECIMAL(14,2) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraBienestar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CifraRelacionEntorno" (
    "id" TEXT NOT NULL,
    "clave" VARCHAR(120) NOT NULL,
    "periodo" VARCHAR(16) NOT NULL,
    "facultad" VARCHAR(300),
    "dimension" VARCHAR(120),
    "valorDimension" VARCHAR(200),
    "valor" DECIMAL(14,2) NOT NULL,
    "integradorId" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CifraRelacionEntorno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integrador_hashClave_key" ON "Integrador"("hashClave");

-- CreateIndex
CREATE INDEX "CifraEstudiante_periodoAcademico_idx" ON "CifraEstudiante"("periodoAcademico");

-- CreateIndex
CREATE INDEX "CifraEstudiante_integradorId_idx" ON "CifraEstudiante"("integradorId");

-- CreateIndex
CREATE INDEX "CifraProfesor_periodoAcademico_idx" ON "CifraProfesor"("periodoAcademico");

-- CreateIndex
CREATE INDEX "CifraProfesor_integradorId_idx" ON "CifraProfesor"("integradorId");

-- CreateIndex
CREATE INDEX "CifraEgresado_graduadosPeriodo_idx" ON "CifraEgresado"("graduadosPeriodo");

-- CreateIndex
CREATE INDEX "CifraEgresado_integradorId_idx" ON "CifraEgresado"("integradorId");

-- CreateIndex
CREATE INDEX "CifraInvestigacion_periodoAcademico_idx" ON "CifraInvestigacion"("periodoAcademico");

-- CreateIndex
CREATE INDEX "CifraInvestigacion_integradorId_idx" ON "CifraInvestigacion"("integradorId");

-- CreateIndex
CREATE INDEX "CifraAseguramiento_periodoAcademico_idx" ON "CifraAseguramiento"("periodoAcademico");

-- CreateIndex
CREATE INDEX "CifraAseguramiento_integradorId_idx" ON "CifraAseguramiento"("integradorId");

-- CreateIndex
CREATE INDEX "CifraInfraestructura_sede_idx" ON "CifraInfraestructura"("sede");

-- CreateIndex
CREATE INDEX "CifraInfraestructura_integradorId_idx" ON "CifraInfraestructura"("integradorId");

-- CreateIndex
CREATE INDEX "CifraBienestar_periodo_idx" ON "CifraBienestar"("periodo");

-- CreateIndex
CREATE INDEX "CifraBienestar_integradorId_idx" ON "CifraBienestar"("integradorId");

-- CreateIndex
CREATE INDEX "CifraRelacionEntorno_periodo_idx" ON "CifraRelacionEntorno"("periodo");

-- CreateIndex
CREATE INDEX "CifraRelacionEntorno_integradorId_idx" ON "CifraRelacionEntorno"("integradorId");

-- AddForeignKey
ALTER TABLE "CifraEstudiante" ADD CONSTRAINT "CifraEstudiante_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraProfesor" ADD CONSTRAINT "CifraProfesor_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraEgresado" ADD CONSTRAINT "CifraEgresado_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraInvestigacion" ADD CONSTRAINT "CifraInvestigacion_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraAseguramiento" ADD CONSTRAINT "CifraAseguramiento_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraInfraestructura" ADD CONSTRAINT "CifraInfraestructura_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraBienestar" ADD CONSTRAINT "CifraBienestar_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CifraRelacionEntorno" ADD CONSTRAINT "CifraRelacionEntorno_integradorId_fkey" FOREIGN KEY ("integradorId") REFERENCES "Integrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Camino 2: RLS en el mismo estilo que el resto de tablas (ENABLE + FORCE, políticas para siac_app).
-- La API de cifras fija app.rol = 'integracion'. SuperAdmin gestiona Integrador con es_gestion().
-- Power BI solo recibe SELECT de las vistas, sin columnas personales ni el hash de la clave.

ALTER TABLE "Integrador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integrador" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraEstudiante" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraEstudiante" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraProfesor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraProfesor" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraEgresado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraEgresado" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraInvestigacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraInvestigacion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraAseguramiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraAseguramiento" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraInfraestructura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraInfraestructura" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraBienestar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraBienestar" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CifraRelacionEntorno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CifraRelacionEntorno" FORCE ROW LEVEL SECURITY;

CREATE POLICY "integrador_select" ON "Integrador" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_gestion() OR siac.es_sistema());
CREATE POLICY "integrador_insert" ON "Integrador" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_gestion() OR siac.es_sistema());
CREATE POLICY "integrador_update" ON "Integrador" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_gestion() OR siac.es_sistema())
  WITH CHECK (siac.es_gestion() OR siac.es_sistema());
CREATE POLICY "integrador_delete" ON "Integrador" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());

CREATE POLICY "cifra_estudiante_select" ON "CifraEstudiante" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_estudiante_insert" ON "CifraEstudiante" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_estudiante_update" ON "CifraEstudiante" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_estudiante_delete" ON "CifraEstudiante" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_profesor_select" ON "CifraProfesor" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_profesor_insert" ON "CifraProfesor" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_profesor_update" ON "CifraProfesor" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_profesor_delete" ON "CifraProfesor" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_egresado_select" ON "CifraEgresado" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_egresado_insert" ON "CifraEgresado" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_egresado_update" ON "CifraEgresado" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_egresado_delete" ON "CifraEgresado" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_investigacion_select" ON "CifraInvestigacion" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_investigacion_insert" ON "CifraInvestigacion" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_investigacion_update" ON "CifraInvestigacion" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_investigacion_delete" ON "CifraInvestigacion" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_aseguramiento_select" ON "CifraAseguramiento" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_aseguramiento_insert" ON "CifraAseguramiento" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_aseguramiento_update" ON "CifraAseguramiento" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_aseguramiento_delete" ON "CifraAseguramiento" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_infraestructura_select" ON "CifraInfraestructura" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_infraestructura_insert" ON "CifraInfraestructura" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_infraestructura_update" ON "CifraInfraestructura" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_infraestructura_delete" ON "CifraInfraestructura" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_bienestar_select" ON "CifraBienestar" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_bienestar_insert" ON "CifraBienestar" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_bienestar_update" ON "CifraBienestar" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_bienestar_delete" ON "CifraBienestar" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "cifra_relacion_entorno_select" ON "CifraRelacionEntorno" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_relacion_entorno_insert" ON "CifraRelacionEntorno" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_relacion_entorno_update" ON "CifraRelacionEntorno" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema())
  WITH CHECK (siac.rol() = 'integracion' OR siac.es_sistema());
CREATE POLICY "cifra_relacion_entorno_delete" ON "CifraRelacionEntorno" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.rol() = 'integracion' OR siac.es_sistema());

CREATE POLICY "powerbi_cifra_estudiante" ON "CifraEstudiante" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_profesor" ON "CifraProfesor" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_egresado" ON "CifraEgresado" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_investigacion" ON "CifraInvestigacion" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_aseguramiento" ON "CifraAseguramiento" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_infraestructura" ON "CifraInfraestructura" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_bienestar" ON "CifraBienestar" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);
CREATE POLICY "powerbi_cifra_relacion_entorno" ON "CifraRelacionEntorno" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

-- Búsqueda de la clave y marca de último uso sin contexto de RLS (igual que el login).
-- Devuelve el hash solo al backend; la comparación en la aplicación usa timingSafeEqual.
CREATE OR REPLACE FUNCTION siac.integradores_activos()
RETURNS TABLE ("id" text, "nombre" text, "hashClave" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT i."id", i."nombre", i."hashClave"
  FROM "Integrador" i
  WHERE i."activo"
$$;

CREATE OR REPLACE FUNCTION siac.marcar_uso_integrador(p_id text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE "Integrador"
  SET "ultimoUsoEn" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = p_id AND "activo"
$$;

REVOKE ALL ON FUNCTION siac.integradores_activos() FROM PUBLIC;
REVOKE ALL ON FUNCTION siac.marcar_uso_integrador(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION siac.integradores_activos() TO siac_app;
GRANT EXECUTE ON FUNCTION siac.marcar_uso_integrador(text) TO siac_app;

-- Vistas de solo lectura. Sin nombre, código ni documento de persona, y sin el integrador.
CREATE OR REPLACE VIEW "v_powerbi_estudiantes" WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "semestre", "estrato",
       "valorDimension" AS "valor_dimension", "periodoAcademico" AS "periodo_academico", "enviadoEn"
FROM "CifraEstudiante";

CREATE OR REPLACE VIEW "v_powerbi_profesores" WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "periodoInicio" AS "periodo_inicio",
       "periodoFinal" AS "periodo_final", "periodoAcademico" AS "periodo_academico", "estrato", "enviadoEn"
FROM "CifraProfesor";

CREATE OR REPLACE VIEW "v_powerbi_egresados" WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "graduadosPeriodo" AS "graduados_periodo",
       "estrato", "grado", "nivel", "enviadoEn"
FROM "CifraEgresado";

CREATE OR REPLACE VIEW "v_powerbi_investigacion" WITH (security_invoker = true) AS
SELECT "id", "facultad", "grupoInvestigacion" AS "grupo_investigacion", "semillero",
       "periodoAcademico" AS "periodo_academico", "cantidadEstudiantes" AS "cantidad_estudiantes",
       "genero", "programa", "enviadoEn"
FROM "CifraInvestigacion";

CREATE OR REPLACE VIEW "v_powerbi_aseguramiento" WITH (security_invoker = true) AS
SELECT "id", "periodoAcademico" AS "periodo_academico", "programas", "facultad", "grado", "nivel",
       "acreditados", "acreditables", "registrosCalificables" AS "registros_calificables",
       "inicioSiac" AS "inicio_siac", "finalizacionSiac" AS "finalizacion_siac", "snies", "enviadoEn"
FROM "CifraAseguramiento";

CREATE OR REPLACE VIEW "v_powerbi_infraestructura" WITH (security_invoker = true) AS
SELECT "id", "sede", "direccion", "numeroPisos" AS "numero_pisos", "estado",
       "totalM2AreaConstruida" AS "total_m2_area_construida",
       "totalM2AreaTerreno" AS "total_m2_area_terreno",
       "cantidadSalonesClase" AS "cantidad_salones_clase",
       "areaM2SalonClase" AS "area_m2_salon_clase",
       "cantidadSalasSistemas" AS "cantidad_salas_sistemas",
       "areaM2SalasSistemas" AS "area_m2_salas_sistemas",
       "cantidadLaboratorios" AS "cantidad_laboratorios",
       "areaM2Laboratorios" AS "area_m2_laboratorios",
       "cantidadAuditorios" AS "cantidad_auditorios",
       "areaM2Auditorios" AS "area_m2_auditorios",
       "cantidadSalasLectura" AS "cantidad_salas_lectura",
       "areaM2SalasLectura" AS "area_m2_salas_lectura",
       "cantidadZonasDeportivas" AS "cantidad_zonas_deportivas",
       "areaM2ZonasDeportivas" AS "area_m2_zonas_deportivas",
       "cantidadCafeterias" AS "cantidad_cafeterias",
       "cantidadZonasEstudio" AS "cantidad_zonas_estudio",
       "cantidadZonasRecreativas" AS "cantidad_zonas_recreativas",
       "enviadoEn"
FROM "CifraInfraestructura";

CREATE OR REPLACE VIEW "v_powerbi_bienestar" WITH (security_invoker = true) AS
SELECT "id", "clave", "periodo", "facultad", "dimension",
       "valorDimension" AS "valor_dimension", "valor", "enviadoEn"
FROM "CifraBienestar";

CREATE OR REPLACE VIEW "v_powerbi_relaciones_entorno" WITH (security_invoker = true) AS
SELECT "id", "clave", "periodo", "facultad", "dimension",
       "valorDimension" AS "valor_dimension", "valor", "enviadoEn"
FROM "CifraRelacionEntorno";

COMMENT ON VIEW "v_powerbi_estudiantes" IS
  'Camino 2: estudiantes para Power BI. Sin nombre_estudiante ni codigo_estudiante.';
COMMENT ON VIEW "v_powerbi_profesores" IS
  'Camino 2: profesores para Power BI. Sin nombre_profesor.';
COMMENT ON VIEW "v_powerbi_egresados" IS
  'Camino 2: egresados para Power BI. Sin nombre_egresado.';
COMMENT ON VIEW "v_powerbi_investigacion" IS
  'Camino 2: investigación para Power BI. Sin datos personales.';
COMMENT ON VIEW "v_powerbi_aseguramiento" IS
  'Camino 2: aseguramiento para Power BI. Sin datos personales.';
COMMENT ON VIEW "v_powerbi_infraestructura" IS
  'Camino 2: infraestructura para Power BI. La dirección es de la sede, no de una persona.';
COMMENT ON VIEW "v_powerbi_bienestar" IS
  'Camino 2: bienestar en clave/valor para Power BI. Sin datos personales.';
COMMENT ON VIEW "v_powerbi_relaciones_entorno" IS
  'Camino 2: relaciones con el entorno en clave/valor para Power BI. Sin datos personales.';

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "Integrador", "CifraEstudiante", "CifraProfesor", "CifraEgresado", "CifraInvestigacion",
  "CifraAseguramiento", "CifraInfraestructura", "CifraBienestar", "CifraRelacionEntorno"
  TO siac_app;

GRANT SELECT ON
  "v_powerbi_estudiantes", "v_powerbi_profesores", "v_powerbi_egresados", "v_powerbi_investigacion",
  "v_powerbi_aseguramiento", "v_powerbi_infraestructura", "v_powerbi_bienestar", "v_powerbi_relaciones_entorno"
  TO siac_powerbi_lectura;

GRANT SELECT ("id", "programa", "genero", "facultad", "semestre", "estrato", "valorDimension", "periodoAcademico", "enviadoEn")
  ON "CifraEstudiante" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programa", "genero", "facultad", "periodoInicio", "periodoFinal", "periodoAcademico", "estrato", "enviadoEn")
  ON "CifraProfesor" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programa", "genero", "facultad", "graduadosPeriodo", "estrato", "grado", "nivel", "enviadoEn")
  ON "CifraEgresado" TO siac_powerbi_lectura;
GRANT SELECT ("id", "facultad", "grupoInvestigacion", "semillero", "periodoAcademico", "cantidadEstudiantes", "genero", "programa", "enviadoEn")
  ON "CifraInvestigacion" TO siac_powerbi_lectura;
GRANT SELECT ("id", "periodoAcademico", "programas", "facultad", "grado", "nivel", "acreditados", "acreditables", "registrosCalificables", "inicioSiac", "finalizacionSiac", "snies", "enviadoEn")
  ON "CifraAseguramiento" TO siac_powerbi_lectura;
GRANT SELECT (
  "id", "sede", "direccion", "numeroPisos", "estado", "totalM2AreaConstruida", "totalM2AreaTerreno",
  "cantidadSalonesClase", "areaM2SalonClase", "cantidadSalasSistemas", "areaM2SalasSistemas",
  "cantidadLaboratorios", "areaM2Laboratorios", "cantidadAuditorios", "areaM2Auditorios",
  "cantidadSalasLectura", "areaM2SalasLectura", "cantidadZonasDeportivas", "areaM2ZonasDeportivas",
  "cantidadCafeterias", "cantidadZonasEstudio", "cantidadZonasRecreativas", "enviadoEn"
) ON "CifraInfraestructura" TO siac_powerbi_lectura;
GRANT SELECT ("id", "clave", "periodo", "facultad", "dimension", "valorDimension", "valor", "enviadoEn")
  ON "CifraBienestar" TO siac_powerbi_lectura;
GRANT SELECT ("id", "clave", "periodo", "facultad", "dimension", "valorDimension", "valor", "enviadoEn")
  ON "CifraRelacionEntorno" TO siac_powerbi_lectura;

REVOKE ALL ON TABLE
  "Integrador", "CifraEstudiante", "CifraProfesor", "CifraEgresado", "CifraInvestigacion",
  "CifraAseguramiento", "CifraInfraestructura", "CifraBienestar", "CifraRelacionEntorno"
  FROM PUBLIC;

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public."Integrador", public."CifraEstudiante", public."CifraProfesor", public."CifraEgresado", public."CifraInvestigacion", public."CifraAseguramiento", public."CifraInfraestructura", public."CifraBienestar", public."CifraRelacionEntorno" FROM %I', r);
    END IF;
  END LOOP;
END
$$;

