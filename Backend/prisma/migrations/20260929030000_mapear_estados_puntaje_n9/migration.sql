-- HU-003 (D1): mapea los dictámenes automáticos del checklist al modelo n/9.
-- Antes: menos de 9/9 => Rechazado y 9/9 => Validado, con un porcentaje.
-- Ahora: puntaje entero n; n < total => ConObservaciones y n = total => Cumple.
-- Validado y Rechazado solo se conservan en documentos sin checklist (G2, G4 u otros),
-- donde fueron una decisión explícita del Revisor.
-- El historial (HistorialEvidencia) no se modifica: es la bitácora de lo que ocurrió.

-- 1. Puntaje desde las evaluaciones de la versión más reciente evaluada (G1, 9 condiciones).
WITH ultima AS (
  SELECT "evidenciaId", max("numeroRevision") AS "numeroRevision"
  FROM "EvaluacionCondicionEvidencia"
  GROUP BY "evidenciaId"
),
puntajes AS (
  SELECT ev."evidenciaId",
         count(*) FILTER (WHERE ev."cumple") AS puntaje
  FROM "EvaluacionCondicionEvidencia" AS ev
  JOIN ultima AS u
    ON u."evidenciaId" = ev."evidenciaId" AND u."numeroRevision" = ev."numeroRevision"
  GROUP BY ev."evidenciaId"
)
UPDATE "Evidencia" AS e
SET "puntajeActual" = p.puntaje,
    "totalCondicionesActual" = 9
FROM puntajes AS p
WHERE e."id" = p."evidenciaId"
  AND e."codigoGuia" IS DISTINCT FROM 'G3'
  AND e."puntajeActual" IS NULL;

-- 2. Puntaje desde las evaluaciones institucionales (G3, 6 condiciones).
WITH ultima AS (
  SELECT "evidenciaId", max("numeroRevision") AS "numeroRevision"
  FROM "EvaluacionCondicionInstitucionalEvidencia"
  GROUP BY "evidenciaId"
),
puntajes AS (
  SELECT ev."evidenciaId",
         count(*) FILTER (WHERE ev."cumple") AS puntaje
  FROM "EvaluacionCondicionInstitucionalEvidencia" AS ev
  JOIN ultima AS u
    ON u."evidenciaId" = ev."evidenciaId" AND u."numeroRevision" = ev."numeroRevision"
  GROUP BY ev."evidenciaId"
)
UPDATE "Evidencia" AS e
SET "puntajeActual" = p.puntaje,
    "totalCondicionesActual" = 6
FROM puntajes AS p
WHERE e."id" = p."evidenciaId"
  AND e."puntajeActual" IS NULL;

-- 3. Documentos con checklist dictaminados sin evaluaciones guardadas: el puntaje se
--    deriva del porcentaje heredado (Validado => total).
UPDATE "Evidencia"
SET "totalCondicionesActual" = CASE WHEN "codigoGuia" = 'G3' THEN 6 ELSE 9 END,
    "puntajeActual" = CASE
      WHEN "estado" = 'Validado' THEN CASE WHEN "codigoGuia" = 'G3' THEN 6 ELSE 9 END
      ELSE LEAST(
        CASE WHEN "codigoGuia" = 'G3' THEN 6 ELSE 9 END,
        GREATEST(0, round("porcentajeCompletitud" * (CASE WHEN "codigoGuia" = 'G3' THEN 6 ELSE 9 END) / 100.0)::int)
      )
    END
WHERE "codigoGuia" IN ('G1', 'G3')
  AND "estado" IN ('Validado', 'Rechazado')
  AND "puntajeActual" IS NULL;

-- 4. Estados: solo documentos con checklist (G1/G3) que ya tienen puntaje.
UPDATE "Evidencia"
SET "estado" = 'Cumple'
WHERE "codigoGuia" IN ('G1', 'G3')
  AND "estado" IN ('Validado', 'Rechazado')
  AND "puntajeActual" IS NOT NULL
  AND "puntajeActual" = "totalCondicionesActual";

UPDATE "Evidencia"
SET "estado" = 'ConObservaciones'
WHERE "codigoGuia" IN ('G1', 'G3')
  AND "estado" IN ('Validado', 'Rechazado')
  AND "puntajeActual" IS NOT NULL
  AND "puntajeActual" < "totalCondicionesActual";
