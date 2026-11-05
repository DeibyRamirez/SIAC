-- T-009.1: vista de solo lectura con los puntajes de los documentos guía para Power BI.
--
-- Una fila por documento guía con puntaje y su último dictamen:
--   * G1 (documento maestro del programa): puntaje n/9.
--   * G3 (condiciones institucionales): puntaje n/6 (alcance institucional, sin programa).
-- Columnas: programa, guía, puntaje, estado, condiciones cumplidas y no cumplidas del último
-- dictamen y semáforo de vigencia del registro (umbrales de "ConfiguracionSIAC").
--
-- Sin datos personales: no expone autor, revisor, responsable, correos, observaciones, nombres
-- ni rutas de archivo. Los borradores no aparecen (son privados de su autor, RN-001).
-- security_invoker: la vista respeta los permisos y la RLS de quien consulta (plan RLS, rol de
-- lectura del feed de Power BI). Requiere PostgreSQL 15 o superior (Supabase lo cumple).

CREATE OR REPLACE VIEW "v_powerbi_puntajes"
WITH (security_invoker = true) AS
WITH config AS (
  SELECT
    COALESCE(MAX("aniosVigencia"), 7)       AS anios,
    COALESCE(MAX("mesesAvisoVigencia"), 12) AS meses_aviso,
    COALESCE(MAX("mesesRojoVigencia"), 6)   AS meses_rojo
  FROM "ConfiguracionSIAC"
  WHERE "id" = 'global'
),
ultima_por_guia AS (
  -- La evidencia vigente de cada guía: la más reciente fuera de Borrador por programa o institución.
  SELECT DISTINCT ON (COALESCE(e."programaId", e."institucionId"), e."codigoGuia")
    e."id",
    e."programaId",
    e."institucionId",
    e."codigoGuia",
    e."estado",
    e."periodo",
    e."puntajeActual",
    e."totalCondicionesActual",
    e."updatedAt"
  FROM "Evidencia" e
  WHERE e."codigoGuia" IN ('G1', 'G3')
    AND e."estado" <> 'Borrador'
  ORDER BY COALESCE(e."programaId", e."institucionId"), e."codigoGuia", e."updatedAt" DESC, e."id"
),
condiciones AS (
  -- Último dictamen (mayor numeroRevision) de G1 y de G3.
  SELECT c."evidenciaId",
         COUNT(*) FILTER (WHERE c."cumple")     AS cumplidas,
         COUNT(*) FILTER (WHERE NOT c."cumple") AS no_cumplidas
  FROM (
    SELECT "evidenciaId", "numeroRevision", "cumple",
           MAX("numeroRevision") OVER (PARTITION BY "evidenciaId") AS ultima
    FROM "EvaluacionCondicionEvidencia"
    UNION ALL
    SELECT "evidenciaId", "numeroRevision", "cumple",
           MAX("numeroRevision") OVER (PARTITION BY "evidenciaId") AS ultima
    FROM "EvaluacionCondicionInstitucionalEvidencia"
  ) c
  WHERE c."numeroRevision" = c.ultima
  GROUP BY c."evidenciaId"
)
SELECT
  u."id"                                                   AS "evidenciaId",
  CASE WHEN u."programaId" IS NULL THEN 'Institucion' ELSE 'Programa' END AS "alcance",
  u."programaId",
  p."codigo"                                               AS "codigoPrograma",
  COALESCE(p."nombre", i."nombre")                         AS "programa",
  p."facultad",
  p."nivel",
  u."codigoGuia"::text                                     AS "codigoGuia",
  u."periodo",
  u."estado"::text                                         AS "estado",
  u."puntajeActual"                                        AS "puntaje",
  COALESCE(u."totalCondicionesActual", CASE u."codigoGuia" WHEN 'G1' THEN 9 ELSE 6 END)
                                                           AS "totalCondiciones",
  CASE WHEN u."puntajeActual" IS NULL THEN NULL
       ELSE u."puntajeActual"::text || '/' ||
            COALESCE(u."totalCondicionesActual", CASE u."codigoGuia" WHEN 'G1' THEN 9 ELSE 6 END)::text
  END                                                      AS "puntajeTexto",
  COALESCE(c.cumplidas, 0)::int                            AS "condicionesCumplidas",
  COALESCE(c.no_cumplidas, 0)::int                         AS "condicionesNoCumplidas",
  COALESCE(p."fechaResolucion", i."fechaResolucion")       AS "fechaResolucion",
  CASE
    WHEN COALESCE(p."fechaResolucion", i."fechaResolucion") IS NULL THEN 'SinVigencia'
    WHEN (now() AT TIME ZONE 'UTC') >= COALESCE(p."fechaResolucion", i."fechaResolucion")
         + make_interval(years => cfg.anios) THEN 'Vencido'
    WHEN (now() AT TIME ZONE 'UTC') >= COALESCE(p."fechaResolucion", i."fechaResolucion")
         + make_interval(years => cfg.anios) - make_interval(months => cfg.meses_rojo) THEN 'Rojo'
    WHEN (now() AT TIME ZONE 'UTC') >= COALESCE(p."fechaResolucion", i."fechaResolucion")
         + make_interval(years => cfg.anios) - make_interval(months => cfg.meses_aviso) THEN 'Amarillo'
    ELSE 'Verde'
  END                                                      AS "semaforoVigencia",
  u."updatedAt"                                            AS "actualizadoEn"
FROM ultima_por_guia u
CROSS JOIN config cfg  -- MAX() sin GROUP BY siempre devuelve una fila (con valores por defecto si falta "global")
LEFT JOIN "Programa" p ON p."id" = u."programaId"
LEFT JOIN "Institucion" i ON i."id" = u."institucionId"
LEFT JOIN condiciones c ON c."evidenciaId" = u."id"
WHERE (u."programaId" IS NULL OR p."activo");

COMMENT ON VIEW "v_powerbi_puntajes" IS
  'T-009.1: puntajes G1 (n/9) y G3 (n/6) por programa/institución para Power BI. Solo lectura, sin datos personales ni borradores.';
