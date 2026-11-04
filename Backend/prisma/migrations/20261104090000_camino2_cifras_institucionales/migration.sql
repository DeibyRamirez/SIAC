-- Camino 2: hub Postgres de cifras institucionales (API → tablas Cifra* → vistas Power BI).
-- Compatible con Supabase y PostgreSQL de producción. CREATE TABLE IF NOT EXISTS en
-- CifraEstudiante por si el SQL Editor ya la creó a mano con la misma forma.
-- No se editan migraciones anteriores. Data API (anon/authenticated) sigue revocada.

-- 1. Tablas de integración -----------------------------------------------------------------

CREATE TABLE "ClaveIntegracion" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "prefijo" VARCHAR(24) NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "categorias" TEXT[] NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "ultimoUsoAt" TIMESTAMP(3),
    "creadaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaveIntegracion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaveIntegracion_hash_key" ON "ClaveIntegracion"("hash");
CREATE INDEX "ClaveIntegracion_activa_idx" ON "ClaveIntegracion"("activa");

CREATE TABLE "EnvioCifras" (
    "id" TEXT NOT NULL,
    "categoriaId" VARCHAR(32) NOT NULL,
    "periodo" VARCHAR(10),
    "ambito" VARCHAR(200),
    "filasOk" INTEGER NOT NULL,
    "claveIntegracionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioCifras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnvioCifras_categoriaId_periodo_idx" ON "EnvioCifras"("categoriaId", "periodo");
CREATE INDEX "EnvioCifras_claveIntegracionId_idx" ON "EnvioCifras"("claveIntegracionId");

-- 2. Tablas de cifras ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CifraEstudiante" (
    "id" TEXT NOT NULL,
    "nombreEstudiante" VARCHAR(200),
    "programa" VARCHAR(200) NOT NULL,
    "genero" VARCHAR(50) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "semestre" INTEGER NOT NULL,
    "estrato" INTEGER NOT NULL,
    "codigoEstudiante" VARCHAR(50) NOT NULL,
    "periodoAcademico" VARCHAR(10) NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraEstudiante_pkey" PRIMARY KEY ("id")
);

-- Si la tabla ya existía (SQL Editor) y le falta envioId, se alinea sin borrar filas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CifraEstudiante' AND column_name = 'envioId'
  ) THEN
    ALTER TABLE "CifraEstudiante" ADD COLUMN "envioId" TEXT;
  END IF;
END
$$;

CREATE TABLE "CifraProfesor" (
    "id" TEXT NOT NULL,
    "nombreProfesor" VARCHAR(200),
    "programa" VARCHAR(200) NOT NULL,
    "genero" VARCHAR(50) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "periodoInicio" VARCHAR(10) NOT NULL,
    "periodoFinal" VARCHAR(10),
    "periodoAcademico" VARCHAR(10) NOT NULL,
    "estrato" INTEGER NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraProfesor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CifraEgresado" (
    "id" TEXT NOT NULL,
    "nombreEgresado" VARCHAR(200),
    "programa" VARCHAR(200) NOT NULL,
    "genero" VARCHAR(50) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "graduadosPeriodo" VARCHAR(10) NOT NULL,
    "estrato" INTEGER NOT NULL,
    "grado" VARCHAR(80) NOT NULL,
    "nivel" VARCHAR(80) NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraEgresado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CifraInvestigacion" (
    "id" TEXT NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "grupoInvestigacion" VARCHAR(200) NOT NULL,
    "semillero" VARCHAR(200) NOT NULL,
    "periodoAcademico" VARCHAR(10) NOT NULL,
    "cantidadEstudiantes" INTEGER NOT NULL,
    "genero" VARCHAR(50) NOT NULL,
    "programa" VARCHAR(200) NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraInvestigacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CifraAseguramiento" (
    "id" TEXT NOT NULL,
    "periodoAcademico" VARCHAR(10) NOT NULL,
    "programas" VARCHAR(200) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "grado" VARCHAR(80) NOT NULL,
    "nivel" VARCHAR(80) NOT NULL,
    "acreditados" INTEGER NOT NULL DEFAULT 0,
    "acreditables" INTEGER NOT NULL DEFAULT 0,
    "registrosCalificables" INTEGER NOT NULL DEFAULT 0,
    "inicioSiac" DATE NOT NULL,
    "finalizacionSiac" DATE NOT NULL,
    "snies" VARCHAR(20) NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraAseguramiento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CifraInfraestructura" (
    "id" TEXT NOT NULL,
    "sede" VARCHAR(200) NOT NULL,
    "direccion" VARCHAR(300) NOT NULL,
    "numeroPisos" INTEGER NOT NULL,
    "estado" VARCHAR(50) NOT NULL,
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
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraInfraestructura_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CifraBienestar" (
    "id" TEXT NOT NULL,
    "clave" VARCHAR(120) NOT NULL,
    "periodo" VARCHAR(10) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "dimension" VARCHAR(80) NOT NULL,
    "valorDimension" VARCHAR(120) NOT NULL,
    "valor" DECIMAL(12,4) NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraBienestar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CifraRelacionEntorno" (
    "id" TEXT NOT NULL,
    "clave" VARCHAR(120) NOT NULL,
    "periodo" VARCHAR(10) NOT NULL,
    "facultad" VARCHAR(200) NOT NULL,
    "dimension" VARCHAR(80) NOT NULL,
    "valorDimension" VARCHAR(120) NOT NULL,
    "valor" DECIMAL(12,4) NOT NULL,
    "envioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CifraRelacionEntorno_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CifraEstudiante_periodoAcademico_facultad_programa_idx"
  ON "CifraEstudiante"("periodoAcademico", "facultad", "programa");
CREATE INDEX IF NOT EXISTS "CifraEstudiante_envioId_idx" ON "CifraEstudiante"("envioId");
CREATE INDEX "CifraProfesor_periodoAcademico_facultad_programa_idx"
  ON "CifraProfesor"("periodoAcademico", "facultad", "programa");
CREATE INDEX "CifraProfesor_envioId_idx" ON "CifraProfesor"("envioId");
CREATE INDEX "CifraEgresado_graduadosPeriodo_facultad_programa_idx"
  ON "CifraEgresado"("graduadosPeriodo", "facultad", "programa");
CREATE INDEX "CifraEgresado_envioId_idx" ON "CifraEgresado"("envioId");
CREATE INDEX "CifraInvestigacion_periodoAcademico_facultad_programa_idx"
  ON "CifraInvestigacion"("periodoAcademico", "facultad", "programa");
CREATE INDEX "CifraInvestigacion_envioId_idx" ON "CifraInvestigacion"("envioId");
CREATE INDEX "CifraAseguramiento_periodoAcademico_facultad_idx"
  ON "CifraAseguramiento"("periodoAcademico", "facultad");
CREATE INDEX "CifraAseguramiento_envioId_idx" ON "CifraAseguramiento"("envioId");
CREATE INDEX "CifraInfraestructura_sede_idx" ON "CifraInfraestructura"("sede");
CREATE INDEX "CifraInfraestructura_envioId_idx" ON "CifraInfraestructura"("envioId");
CREATE INDEX "CifraBienestar_periodo_facultad_clave_idx"
  ON "CifraBienestar"("periodo", "facultad", "clave");
CREATE INDEX "CifraBienestar_envioId_idx" ON "CifraBienestar"("envioId");
CREATE INDEX "CifraRelacionEntorno_periodo_facultad_clave_idx"
  ON "CifraRelacionEntorno"("periodo", "facultad", "clave");
CREATE INDEX "CifraRelacionEntorno_envioId_idx" ON "CifraRelacionEntorno"("envioId");

ALTER TABLE "ClaveIntegracion"
  ADD CONSTRAINT "ClaveIntegracion_creadaPorId_fkey"
  FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnvioCifras"
  ADD CONSTRAINT "EnvioCifras_claveIntegracionId_fkey"
  FOREIGN KEY ("claveIntegracionId") REFERENCES "ClaveIntegracion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CifraEstudiante_envioId_fkey') THEN
    ALTER TABLE "CifraEstudiante"
      ADD CONSTRAINT "CifraEstudiante_envioId_fkey"
      FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
ALTER TABLE "CifraProfesor"
  ADD CONSTRAINT "CifraProfesor_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CifraEgresado"
  ADD CONSTRAINT "CifraEgresado_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CifraInvestigacion"
  ADD CONSTRAINT "CifraInvestigacion_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CifraAseguramiento"
  ADD CONSTRAINT "CifraAseguramiento_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CifraInfraestructura"
  ADD CONSTRAINT "CifraInfraestructura_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CifraBienestar"
  ADD CONSTRAINT "CifraBienestar_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CifraRelacionEntorno"
  ADD CONSTRAINT "CifraRelacionEntorno_envioId_fkey"
  FOREIGN KEY ("envioId") REFERENCES "EnvioCifras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Vistas Power BI (sin nombres personales; security_invoker) -----------------------------

CREATE OR REPLACE VIEW "v_powerbi_cifras_estudiantes"
WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "semestre", "estrato",
       "codigoEstudiante", "periodoAcademico", "createdAt", "updatedAt"
FROM "CifraEstudiante";

CREATE OR REPLACE VIEW "v_powerbi_cifras_profesores"
WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "periodoInicio", "periodoFinal",
       "periodoAcademico", "estrato", "createdAt", "updatedAt"
FROM "CifraProfesor";

CREATE OR REPLACE VIEW "v_powerbi_cifras_egresados"
WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "graduadosPeriodo", "estrato",
       "grado", "nivel", "createdAt", "updatedAt"
FROM "CifraEgresado";

CREATE OR REPLACE VIEW "v_powerbi_cifras_investigacion"
WITH (security_invoker = true) AS
SELECT "id", "facultad", "grupoInvestigacion", "semillero", "periodoAcademico",
       "cantidadEstudiantes", "genero", "programa", "createdAt", "updatedAt"
FROM "CifraInvestigacion";

CREATE OR REPLACE VIEW "v_powerbi_cifras_aseguramiento"
WITH (security_invoker = true) AS
SELECT "id", "periodoAcademico", "programas", "facultad", "grado", "nivel",
       "acreditados", "acreditables", "registrosCalificables", "inicioSiac",
       "finalizacionSiac", "snies", "createdAt", "updatedAt"
FROM "CifraAseguramiento";

CREATE OR REPLACE VIEW "v_powerbi_cifras_infraestructura"
WITH (security_invoker = true) AS
SELECT "id", "sede", "direccion", "numeroPisos", "estado",
       "totalM2AreaConstruida", "totalM2AreaTerreno",
       "cantidadSalonesClase", "areaM2SalonClase",
       "cantidadSalasSistemas", "areaM2SalasSistemas",
       "cantidadLaboratorios", "areaM2Laboratorios",
       "cantidadAuditorios", "areaM2Auditorios",
       "cantidadSalasLectura", "areaM2SalasLectura",
       "cantidadZonasDeportivas", "areaM2ZonasDeportivas",
       "cantidadCafeterias", "cantidadZonasEstudio", "cantidadZonasRecreativas",
       "createdAt", "updatedAt"
FROM "CifraInfraestructura";

CREATE OR REPLACE VIEW "v_powerbi_cifras_bienestar"
WITH (security_invoker = true) AS
SELECT "id", "clave", "periodo", "facultad", "dimension", "valorDimension",
       "valor", "createdAt", "updatedAt"
FROM "CifraBienestar";

CREATE OR REPLACE VIEW "v_powerbi_cifras_relaciones_entorno"
WITH (security_invoker = true) AS
SELECT "id", "clave", "periodo", "facultad", "dimension", "valorDimension",
       "valor", "createdAt", "updatedAt"
FROM "CifraRelacionEntorno";

-- 4. RLS -----------------------------------------------------------------------------------

ALTER TABLE "ClaveIntegracion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClaveIntegracion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EnvioCifras" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnvioCifras" FORCE ROW LEVEL SECURITY;
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

CREATE POLICY "clave_integracion_select" ON "ClaveIntegracion" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "clave_integracion_insert" ON "ClaveIntegracion" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "clave_integracion_update" ON "ClaveIntegracion" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion())
  WITH CHECK (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "clave_integracion_delete" ON "ClaveIntegracion" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());

CREATE POLICY "envio_cifras_select" ON "EnvioCifras" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "envio_cifras_insert" ON "EnvioCifras" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "envio_cifras_update" ON "EnvioCifras" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "envio_cifras_delete" ON "EnvioCifras" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());

CREATE POLICY "cifra_estudiante_select" ON "CifraEstudiante" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_estudiante_insert" ON "CifraEstudiante" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_estudiante_update" ON "CifraEstudiante" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_estudiante_delete" ON "CifraEstudiante" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_estudiante" ON "CifraEstudiante" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_profesor_select" ON "CifraProfesor" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_profesor_insert" ON "CifraProfesor" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_profesor_update" ON "CifraProfesor" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_profesor_delete" ON "CifraProfesor" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_profesor" ON "CifraProfesor" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_egresado_select" ON "CifraEgresado" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_egresado_insert" ON "CifraEgresado" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_egresado_update" ON "CifraEgresado" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_egresado_delete" ON "CifraEgresado" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_egresado" ON "CifraEgresado" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_investigacion_select" ON "CifraInvestigacion" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_investigacion_insert" ON "CifraInvestigacion" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_investigacion_update" ON "CifraInvestigacion" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_investigacion_delete" ON "CifraInvestigacion" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_investigacion" ON "CifraInvestigacion" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_aseguramiento_select" ON "CifraAseguramiento" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_aseguramiento_insert" ON "CifraAseguramiento" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_aseguramiento_update" ON "CifraAseguramiento" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_aseguramiento_delete" ON "CifraAseguramiento" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_aseguramiento" ON "CifraAseguramiento" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_infraestructura_select" ON "CifraInfraestructura" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_infraestructura_insert" ON "CifraInfraestructura" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_infraestructura_update" ON "CifraInfraestructura" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_infraestructura_delete" ON "CifraInfraestructura" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_infraestructura" ON "CifraInfraestructura" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_bienestar_select" ON "CifraBienestar" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_bienestar_insert" ON "CifraBienestar" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_bienestar_update" ON "CifraBienestar" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_bienestar_delete" ON "CifraBienestar" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_bienestar" ON "CifraBienestar" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

CREATE POLICY "cifra_relacion_entorno_select" ON "CifraRelacionEntorno" AS PERMISSIVE FOR SELECT TO siac_app
  USING (siac.es_sistema() OR siac.es_gestion());
CREATE POLICY "cifra_relacion_entorno_insert" ON "CifraRelacionEntorno" AS PERMISSIVE FOR INSERT TO siac_app
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_relacion_entorno_update" ON "CifraRelacionEntorno" AS PERMISSIVE FOR UPDATE TO siac_app
  USING (siac.es_sistema())
  WITH CHECK (siac.es_sistema());
CREATE POLICY "cifra_relacion_entorno_delete" ON "CifraRelacionEntorno" AS PERMISSIVE FOR DELETE TO siac_app
  USING (siac.es_sistema());
CREATE POLICY "powerbi_cifra_relacion_entorno" ON "CifraRelacionEntorno" AS PERMISSIVE FOR SELECT TO siac_powerbi_lectura
  USING (true);

-- 5. Permisos de siac_app (por si CifraEstudiante ya existía y no heredó DEFAULT PRIVILEGES)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "ClaveIntegracion", "EnvioCifras", "CifraEstudiante", "CifraProfesor", "CifraEgresado",
  "CifraInvestigacion", "CifraAseguramiento", "CifraInfraestructura", "CifraBienestar",
  "CifraRelacionEntorno"
  TO siac_app;

-- 6. Permisos de siac_powerbi_lectura (columnas de negocio, sin nombres personales) --------

GRANT SELECT ON "v_powerbi_cifras_estudiantes" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_profesores" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_egresados" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_investigacion" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_aseguramiento" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_infraestructura" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_bienestar" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_cifras_relaciones_entorno" TO siac_powerbi_lectura;

GRANT SELECT ("id", "programa", "genero", "facultad", "semestre", "estrato",
              "codigoEstudiante", "periodoAcademico", "createdAt", "updatedAt")
  ON "CifraEstudiante" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programa", "genero", "facultad", "periodoInicio", "periodoFinal",
              "periodoAcademico", "estrato", "createdAt", "updatedAt")
  ON "CifraProfesor" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programa", "genero", "facultad", "graduadosPeriodo", "estrato",
              "grado", "nivel", "createdAt", "updatedAt")
  ON "CifraEgresado" TO siac_powerbi_lectura;
GRANT SELECT ("id", "facultad", "grupoInvestigacion", "semillero", "periodoAcademico",
              "cantidadEstudiantes", "genero", "programa", "createdAt", "updatedAt")
  ON "CifraInvestigacion" TO siac_powerbi_lectura;
GRANT SELECT ("id", "periodoAcademico", "programas", "facultad", "grado", "nivel",
              "acreditados", "acreditables", "registrosCalificables", "inicioSiac",
              "finalizacionSiac", "snies", "createdAt", "updatedAt")
  ON "CifraAseguramiento" TO siac_powerbi_lectura;
GRANT SELECT ("id", "sede", "direccion", "numeroPisos", "estado",
              "totalM2AreaConstruida", "totalM2AreaTerreno",
              "cantidadSalonesClase", "areaM2SalonClase",
              "cantidadSalasSistemas", "areaM2SalasSistemas",
              "cantidadLaboratorios", "areaM2Laboratorios",
              "cantidadAuditorios", "areaM2Auditorios",
              "cantidadSalasLectura", "areaM2SalasLectura",
              "cantidadZonasDeportivas", "areaM2ZonasDeportivas",
              "cantidadCafeterias", "cantidadZonasEstudio", "cantidadZonasRecreativas",
              "createdAt", "updatedAt")
  ON "CifraInfraestructura" TO siac_powerbi_lectura;
GRANT SELECT ("id", "clave", "periodo", "facultad", "dimension", "valorDimension",
              "valor", "createdAt", "updatedAt")
  ON "CifraBienestar" TO siac_powerbi_lectura;
GRANT SELECT ("id", "clave", "periodo", "facultad", "dimension", "valorDimension",
              "valor", "createdAt", "updatedAt")
  ON "CifraRelacionEntorno" TO siac_powerbi_lectura;

-- 7. Data API: sin acceso de anon/authenticated a las tablas nuevas -------------------------
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE "ClaveIntegracion", "EnvioCifras", "CifraEstudiante", "CifraProfesor", "CifraEgresado", "CifraInvestigacion", "CifraAseguramiento", "CifraInfraestructura", "CifraBienestar", "CifraRelacionEntorno" FROM %I', r);
      EXECUTE format('REVOKE ALL ON "v_powerbi_cifras_estudiantes", "v_powerbi_cifras_profesores", "v_powerbi_cifras_egresados", "v_powerbi_cifras_investigacion", "v_powerbi_cifras_aseguramiento", "v_powerbi_cifras_infraestructura", "v_powerbi_cifras_bienestar", "v_powerbi_cifras_relaciones_entorno" FROM %I', r);
    END IF;
  END LOOP;
END
$$;
