-- CifraBienestar y CifraRelacionEntorno dejan el modelo clave/valor.
-- Las filas EAV no se pueden mapear a las columnas nuevas.

DROP VIEW IF EXISTS "v_powerbi_bienestar";
DROP VIEW IF EXISTS "v_powerbi_relaciones_entorno";

DELETE FROM "CifraBienestar";
DELETE FROM "CifraRelacionEntorno";

DROP INDEX IF EXISTS "CifraBienestar_periodo_idx";
DROP INDEX IF EXISTS "CifraRelacionEntorno_periodo_idx";

ALTER TABLE "CifraBienestar"
  DROP COLUMN "clave",
  DROP COLUMN "periodo",
  DROP COLUMN "dimension",
  DROP COLUMN "valorDimension",
  DROP COLUMN "valor",
  ADD COLUMN "periodoAcademico" VARCHAR(16) NOT NULL,
  ADD COLUMN "programa" VARCHAR(300) NOT NULL,
  ADD COLUMN "genero" VARCHAR(20) NOT NULL,
  ADD COLUMN "lineaBienestar" VARCHAR(300) NOT NULL,
  ADD COLUMN "servicio" VARCHAR(300) NOT NULL,
  ADD COLUMN "beneficiarios" INTEGER NOT NULL,
  ADD COLUMN "valorInvertidoCop" DECIMAL(14,2) NOT NULL,
  ALTER COLUMN "facultad" SET NOT NULL;

ALTER TABLE "CifraRelacionEntorno"
  DROP COLUMN "clave",
  DROP COLUMN "periodo",
  DROP COLUMN "dimension",
  DROP COLUMN "valorDimension",
  DROP COLUMN "valor",
  ADD COLUMN "periodoAcademico" VARCHAR(16) NOT NULL,
  ADD COLUMN "programa" VARCHAR(300) NOT NULL,
  ADD COLUMN "tipoRelacion" VARCHAR(200) NOT NULL,
  ADD COLUMN "aliado" VARCHAR(300) NOT NULL,
  ADD COLUMN "sectorAliado" VARCHAR(200) NOT NULL,
  ADD COLUMN "ambito" VARCHAR(200) NOT NULL,
  ADD COLUMN "fechaInicio" DATE NOT NULL,
  ADD COLUMN "fechaFin" DATE NOT NULL,
  ADD COLUMN "estudiantesParticipantes" INTEGER NOT NULL,
  ALTER COLUMN "facultad" SET NOT NULL;

CREATE INDEX "CifraBienestar_periodoAcademico_idx" ON "CifraBienestar"("periodoAcademico");
CREATE INDEX "CifraRelacionEntorno_periodoAcademico_idx" ON "CifraRelacionEntorno"("periodoAcademico");

CREATE OR REPLACE VIEW "v_powerbi_bienestar" WITH (security_invoker = true) AS
SELECT "id",
       "periodoAcademico" AS "periodo_academico",
       "facultad",
       "programa",
       "genero",
       "lineaBienestar" AS "linea_bienestar",
       "servicio",
       "beneficiarios",
       "valorInvertidoCop" AS "valor_invertido_cop",
       "enviadoEn"
FROM "CifraBienestar";

CREATE OR REPLACE VIEW "v_powerbi_relaciones_entorno" WITH (security_invoker = true) AS
SELECT "id",
       "periodoAcademico" AS "periodo_academico",
       "facultad",
       "programa",
       "tipoRelacion" AS "tipo_relacion",
       "aliado",
       "sectorAliado" AS "sector_aliado",
       "ambito",
       "fechaInicio" AS "fecha_inicio",
       "fechaFin" AS "fecha_fin",
       "estudiantesParticipantes" AS "estudiantes_participantes",
       "enviadoEn"
FROM "CifraRelacionEntorno";

COMMENT ON VIEW "v_powerbi_bienestar" IS
  'Camino 2: bienestar por periodo, programa y servicio. Sin datos personales.';
COMMENT ON VIEW "v_powerbi_relaciones_entorno" IS
  'Camino 2: relaciones con el entorno por periodo, aliado y ámbito. Sin datos personales.';

GRANT SELECT ON "v_powerbi_bienestar" TO siac_powerbi_lectura;
GRANT SELECT ON "v_powerbi_relaciones_entorno" TO siac_powerbi_lectura;

GRANT SELECT (
  "id", "periodoAcademico", "facultad", "programa", "genero",
  "lineaBienestar", "servicio", "beneficiarios", "valorInvertidoCop", "enviadoEn"
) ON "CifraBienestar" TO siac_powerbi_lectura;

GRANT SELECT (
  "id", "periodoAcademico", "facultad", "programa", "tipoRelacion", "aliado",
  "sectorAliado", "ambito", "fechaInicio", "fechaFin", "estudiantesParticipantes", "enviadoEn"
) ON "CifraRelacionEntorno" TO siac_powerbi_lectura;
