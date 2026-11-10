-- Columnas físicas en snake_case para Power BI (Camino 2). integradorId y enviadoEn sin cambio.

DROP VIEW IF EXISTS "v_powerbi_estudiantes";
DROP VIEW IF EXISTS "v_powerbi_profesores";
DROP VIEW IF EXISTS "v_powerbi_egresados";
DROP VIEW IF EXISTS "v_powerbi_investigacion";
DROP VIEW IF EXISTS "v_powerbi_aseguramiento";
DROP VIEW IF EXISTS "v_powerbi_infraestructura";
DROP VIEW IF EXISTS "v_powerbi_bienestar";
DROP VIEW IF EXISTS "v_powerbi_relaciones_entorno";

-- CifraEstudiante
ALTER TABLE "CifraEstudiante" RENAME COLUMN "nombreEstudiante" TO "nombre_estudiante";
ALTER TABLE "CifraEstudiante" RENAME COLUMN "valorDimension" TO "valor_dimension";
ALTER TABLE "CifraEstudiante" RENAME COLUMN "codigoEstudiante" TO "codigo_estudiante";
ALTER TABLE "CifraEstudiante" RENAME COLUMN "periodoAcademico" TO "periodo_academico";

-- CifraProfesor
ALTER TABLE "CifraProfesor" RENAME COLUMN "nombreProfesor" TO "nombre_profesor";
ALTER TABLE "CifraProfesor" RENAME COLUMN "periodoInicio" TO "periodo_inicio";
ALTER TABLE "CifraProfesor" RENAME COLUMN "periodoFinal" TO "periodo_final";
ALTER TABLE "CifraProfesor" RENAME COLUMN "periodoAcademico" TO "periodo_academico";

-- CifraEgresado
ALTER TABLE "CifraEgresado" RENAME COLUMN "nombreEgresado" TO "nombre_egresado";
ALTER TABLE "CifraEgresado" RENAME COLUMN "graduadosPeriodo" TO "graduados_periodo";

-- CifraInvestigacion
ALTER TABLE "CifraInvestigacion" RENAME COLUMN "grupoInvestigacion" TO "grupo_investigacion";
ALTER TABLE "CifraInvestigacion" RENAME COLUMN "periodoAcademico" TO "periodo_academico";
ALTER TABLE "CifraInvestigacion" RENAME COLUMN "cantidadEstudiantes" TO "cantidad_estudiantes";

-- CifraAseguramiento
ALTER TABLE "CifraAseguramiento" RENAME COLUMN "periodoAcademico" TO "periodo_academico";
ALTER TABLE "CifraAseguramiento" RENAME COLUMN "registrosCalificables" TO "registros_calificables";
ALTER TABLE "CifraAseguramiento" RENAME COLUMN "inicioSiac" TO "inicio_siac";
ALTER TABLE "CifraAseguramiento" RENAME COLUMN "finalizacionSiac" TO "finalizacion_siac";

-- CifraInfraestructura
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "numeroPisos" TO "numero_pisos";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "totalM2AreaConstruida" TO "total_m2_area_construida";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "totalM2AreaTerreno" TO "total_m2_area_terreno";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadSalonesClase" TO "cantidad_salones_clase";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "areaM2SalonClase" TO "area_m2_salon_clase";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadSalasSistemas" TO "cantidad_salas_sistemas";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "areaM2SalasSistemas" TO "area_m2_salas_sistemas";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadLaboratorios" TO "cantidad_laboratorios";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "areaM2Laboratorios" TO "area_m2_laboratorios";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadAuditorios" TO "cantidad_auditorios";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "areaM2Auditorios" TO "area_m2_auditorios";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadSalasLectura" TO "cantidad_salas_lectura";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "areaM2SalasLectura" TO "area_m2_salas_lectura";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadZonasDeportivas" TO "cantidad_zonas_deportivas";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "areaM2ZonasDeportivas" TO "area_m2_zonas_deportivas";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadCafeterias" TO "cantidad_cafeterias";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadZonasEstudio" TO "cantidad_zonas_estudio";
ALTER TABLE "CifraInfraestructura" RENAME COLUMN "cantidadZonasRecreativas" TO "cantidad_zonas_recreativas";

-- CifraBienestar
ALTER TABLE "CifraBienestar" RENAME COLUMN "periodoAcademico" TO "periodo_academico";
ALTER TABLE "CifraBienestar" RENAME COLUMN "lineaBienestar" TO "linea_bienestar";
ALTER TABLE "CifraBienestar" RENAME COLUMN "valorInvertidoCop" TO "valor_invertido_cop";

-- CifraRelacionEntorno
ALTER TABLE "CifraRelacionEntorno" RENAME COLUMN "periodoAcademico" TO "periodo_academico";
ALTER TABLE "CifraRelacionEntorno" RENAME COLUMN "tipoRelacion" TO "tipo_relacion";
ALTER TABLE "CifraRelacionEntorno" RENAME COLUMN "sectorAliado" TO "sector_aliado";
ALTER TABLE "CifraRelacionEntorno" RENAME COLUMN "fechaInicio" TO "fecha_inicio";
ALTER TABLE "CifraRelacionEntorno" RENAME COLUMN "fechaFin" TO "fecha_fin";
ALTER TABLE "CifraRelacionEntorno" RENAME COLUMN "estudiantesParticipantes" TO "estudiantes_participantes";

-- Prisma nombra índices según la columna física (@map); alinear tras RENAME COLUMN (R-008.1a / migrate diff).
ALTER INDEX "CifraEstudiante_periodoAcademico_idx" RENAME TO "CifraEstudiante_periodo_academico_idx";
ALTER INDEX "CifraProfesor_periodoAcademico_idx" RENAME TO "CifraProfesor_periodo_academico_idx";
ALTER INDEX "CifraEgresado_graduadosPeriodo_idx" RENAME TO "CifraEgresado_graduados_periodo_idx";
ALTER INDEX "CifraInvestigacion_periodoAcademico_idx" RENAME TO "CifraInvestigacion_periodo_academico_idx";
ALTER INDEX "CifraAseguramiento_periodoAcademico_idx" RENAME TO "CifraAseguramiento_periodo_academico_idx";
ALTER INDEX "CifraBienestar_periodoAcademico_idx" RENAME TO "CifraBienestar_periodo_academico_idx";
ALTER INDEX "CifraRelacionEntorno_periodoAcademico_idx" RENAME TO "CifraRelacionEntorno_periodo_academico_idx";

CREATE OR REPLACE VIEW "v_powerbi_estudiantes" WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "semestre", "estrato",
       "valor_dimension", "periodo_academico", "enviadoEn"
FROM "CifraEstudiante";

CREATE OR REPLACE VIEW "v_powerbi_profesores" WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "periodo_inicio",
       "periodo_final", "periodo_academico", "estrato", "enviadoEn"
FROM "CifraProfesor";

CREATE OR REPLACE VIEW "v_powerbi_egresados" WITH (security_invoker = true) AS
SELECT "id", "programa", "genero", "facultad", "graduados_periodo",
       "estrato", "grado", "nivel", "enviadoEn"
FROM "CifraEgresado";

CREATE OR REPLACE VIEW "v_powerbi_investigacion" WITH (security_invoker = true) AS
SELECT "id", "facultad", "grupo_investigacion", "semillero",
       "periodo_academico", "cantidad_estudiantes",
       "genero", "programa", "enviadoEn"
FROM "CifraInvestigacion";

CREATE OR REPLACE VIEW "v_powerbi_aseguramiento" WITH (security_invoker = true) AS
SELECT "id", "periodo_academico", "programas", "facultad", "grado", "nivel",
       "acreditados", "acreditables", "registros_calificables",
       "inicio_siac", "finalizacion_siac", "snies", "enviadoEn"
FROM "CifraAseguramiento";

CREATE OR REPLACE VIEW "v_powerbi_infraestructura" WITH (security_invoker = true) AS
SELECT "id", "sede", "direccion", "numero_pisos", "estado",
       "total_m2_area_construida",
       "total_m2_area_terreno",
       "cantidad_salones_clase",
       "area_m2_salon_clase",
       "cantidad_salas_sistemas",
       "area_m2_salas_sistemas",
       "cantidad_laboratorios",
       "area_m2_laboratorios",
       "cantidad_auditorios",
       "area_m2_auditorios",
       "cantidad_salas_lectura",
       "area_m2_salas_lectura",
       "cantidad_zonas_deportivas",
       "area_m2_zonas_deportivas",
       "cantidad_cafeterias",
       "cantidad_zonas_estudio",
       "cantidad_zonas_recreativas",
       "enviadoEn"
FROM "CifraInfraestructura";

CREATE OR REPLACE VIEW "v_powerbi_bienestar" WITH (security_invoker = true) AS
SELECT "id",
       "periodo_academico",
       "facultad",
       "programa",
       "genero",
       "linea_bienestar",
       "servicio",
       "beneficiarios",
       "valor_invertido_cop",
       "enviadoEn"
FROM "CifraBienestar";

CREATE OR REPLACE VIEW "v_powerbi_relaciones_entorno" WITH (security_invoker = true) AS
SELECT "id",
       "periodo_academico",
       "facultad",
       "programa",
       "tipo_relacion",
       "aliado",
       "sector_aliado",
       "ambito",
       "fecha_inicio",
       "fecha_fin",
       "estudiantes_participantes",
       "enviadoEn"
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
  'Camino 2: bienestar por periodo, programa y servicio. Sin datos personales.';
COMMENT ON VIEW "v_powerbi_relaciones_entorno" IS
  'Camino 2: relaciones con el entorno por periodo, aliado y ámbito. Sin datos personales.';

GRANT SELECT ON
  "v_powerbi_estudiantes", "v_powerbi_profesores", "v_powerbi_egresados", "v_powerbi_investigacion",
  "v_powerbi_aseguramiento", "v_powerbi_infraestructura", "v_powerbi_bienestar", "v_powerbi_relaciones_entorno"
  TO siac_powerbi_lectura;

REVOKE ALL ON TABLE
  "CifraEstudiante", "CifraProfesor", "CifraEgresado", "CifraInvestigacion",
  "CifraAseguramiento", "CifraInfraestructura", "CifraBienestar", "CifraRelacionEntorno"
  FROM siac_powerbi_lectura;

GRANT SELECT ("id", "programa", "genero", "facultad", "semestre", "estrato", "valor_dimension", "periodo_academico", "enviadoEn")
  ON "CifraEstudiante" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programa", "genero", "facultad", "periodo_inicio", "periodo_final", "periodo_academico", "estrato", "enviadoEn")
  ON "CifraProfesor" TO siac_powerbi_lectura;
GRANT SELECT ("id", "programa", "genero", "facultad", "graduados_periodo", "estrato", "grado", "nivel", "enviadoEn")
  ON "CifraEgresado" TO siac_powerbi_lectura;
GRANT SELECT ("id", "facultad", "grupo_investigacion", "semillero", "periodo_academico", "cantidad_estudiantes", "genero", "programa", "enviadoEn")
  ON "CifraInvestigacion" TO siac_powerbi_lectura;
GRANT SELECT ("id", "periodo_academico", "programas", "facultad", "grado", "nivel", "acreditados", "acreditables", "registros_calificables", "inicio_siac", "finalizacion_siac", "snies", "enviadoEn")
  ON "CifraAseguramiento" TO siac_powerbi_lectura;
GRANT SELECT (
  "id", "sede", "direccion", "numero_pisos", "estado", "total_m2_area_construida", "total_m2_area_terreno",
  "cantidad_salones_clase", "area_m2_salon_clase", "cantidad_salas_sistemas", "area_m2_salas_sistemas",
  "cantidad_laboratorios", "area_m2_laboratorios", "cantidad_auditorios", "area_m2_auditorios",
  "cantidad_salas_lectura", "area_m2_salas_lectura", "cantidad_zonas_deportivas", "area_m2_zonas_deportivas",
  "cantidad_cafeterias", "cantidad_zonas_estudio", "cantidad_zonas_recreativas", "enviadoEn"
) ON "CifraInfraestructura" TO siac_powerbi_lectura;
GRANT SELECT (
  "id", "periodo_academico", "facultad", "programa", "genero",
  "linea_bienestar", "servicio", "beneficiarios", "valor_invertido_cop", "enviadoEn"
) ON "CifraBienestar" TO siac_powerbi_lectura;
GRANT SELECT (
  "id", "periodo_academico", "facultad", "programa", "tipo_relacion", "aliado",
  "sector_aliado", "ambito", "fecha_inicio", "fecha_fin", "estudiantes_participantes", "enviadoEn"
) ON "CifraRelacionEntorno" TO siac_powerbi_lectura;
