-- Relleno de datos para las migraciones del 28/09 (programa_url_imagen, tramites_g1_g4
-- y evidencia_codigo_guia), que agregaron columnas sin poblar las filas existentes.
-- Sin este relleno, las evidencias históricas quedan sin guía y el avance del trámite
-- puede salir en 0 %. Todas las sentencias son idempotentes y solo tocan valores NULL.

-- 1. Programa.urlImagen: misma imagen genérica que usa la semilla.
UPDATE "Programa"
SET "urlImagen" = '/imagenes/siac/placeholder-programa.svg'
WHERE "urlImagen" IS NULL;

-- 2. Catálogo de trámites SIAC (mismo contenido que catalogo-tramites-siac.ts y la semilla).
INSERT INTO "TramiteSIAC" ("id", "tipo", "alcance", "nombre", "activo", "createdAt", "updatedAt")
VALUES
  ('tramite-registro-calificado-nuevo', 'RegistroCalificadoNuevo', 'Programa', 'Registro calificado nuevo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tramite-renovacion-registro-calificado', 'RenovacionRegistroCalificado', 'Programa', 'Renovación de registro calificado', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tramite-condiciones-institucionales-nuevas', 'CondicionesInstitucionalesNuevas', 'Institucion', 'Condiciones institucionales nuevas', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tramite-renovacion-condiciones-institucionales', 'RenovacionCondicionesInstitucionales', 'Institucion', 'Renovación de condiciones institucionales', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tipo") DO NOTHING;

INSERT INTO "TramiteDocumentoGuia" ("id", "tramiteId", "codigoGuia", "orden")
SELECT
  'tramite-guia-' || lower(t."tipo"::text) || '-' || lower(g.codigo),
  t."id",
  g.codigo::"CodigoDocumentoGuia",
  g.orden
FROM "TramiteSIAC" AS t
JOIN (
  VALUES
    ('RegistroCalificadoNuevo', 'G1', 0),
    ('RenovacionRegistroCalificado', 'G1', 0),
    ('RenovacionRegistroCalificado', 'G2', 1),
    ('CondicionesInstitucionalesNuevas', 'G3', 0),
    ('RenovacionCondicionesInstitucionales', 'G3', 0),
    ('RenovacionCondicionesInstitucionales', 'G4', 1)
) AS g(tipo, codigo, orden) ON g.tipo = t."tipo"::text
ON CONFLICT ("tramiteId", "codigoGuia") DO NOTHING;

-- 3. DocumentoRequerido.codigoGuia: el documento que exige el checklist maestro es la guía G1.
UPDATE "DocumentoRequerido"
SET "codigoGuia" = 'G1'
WHERE "codigoGuia" IS NULL
  AND "requiereChecklistMaestro" = true;

-- 4. Plantilla.codigoGuia: la guía del documento maestro de programa es G1.
UPDATE "Plantilla"
SET "codigoGuia" = 'G1'
WHERE "codigoGuia" IS NULL
  AND "esGuiaDocumentoMaestro" = true
  AND "categoria" <> 'Institucional';

-- 5. Evidencia.codigoGuia, de la señal más fuerte a la más débil.
-- 5.1 Evaluaciones de condiciones institucionales ya registradas => G3.
UPDATE "Evidencia" AS e
SET "codigoGuia" = 'G3'
WHERE e."codigoGuia" IS NULL
  AND EXISTS (
    SELECT 1 FROM "EvaluacionCondicionInstitucionalEvidencia" AS ci
    WHERE ci."evidenciaId" = e."id"
  );

-- 5.2 Evaluaciones de condiciones de programa o checklist maestro activo => G1.
UPDATE "Evidencia" AS e
SET "codigoGuia" = 'G1'
WHERE e."codigoGuia" IS NULL
  AND (
    e."requiereChecklistMaestro" = true
    OR EXISTS (
      SELECT 1 FROM "EvaluacionCondicionEvidencia" AS cp
      WHERE cp."evidenciaId" = e."id"
    )
  );

-- 5.3 Hereda la guía del documento requerido al que está vinculada.
UPDATE "Evidencia" AS e
SET "codigoGuia" = d."codigoGuia"
FROM "DocumentoRequerido" AS d
WHERE e."codigoGuia" IS NULL
  AND e."documentoRequeridoId" = d."id"
  AND d."codigoGuia" IS NOT NULL;

-- 5.4 Mantiene coherente la bandera heredada con la guía G1.
UPDATE "Evidencia"
SET "requiereChecklistMaestro" = true
WHERE "codigoGuia" = 'G1'
  AND "requiereChecklistMaestro" = false;
