-- T-011.1: facultad y slug único (kebab-case, sin tildes), sin perder filas existentes.
-- T-011.2: un usuario no puede quedar dos veces en el mismo programa.
-- Las columnas derivadas semaforo y porcentajeAvance se conservan hasta T-010.1;
-- este cambio no las escribe.

ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "facultad" VARCHAR(200);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(160);

UPDATE "Programa"
SET "slug" = NULLIF(
  trim(both '-' from lower(
    regexp_replace(
      translate(
        "nombre",
        'áéíóúàèìòùäëïöüÁÉÍÓÚÀÈÌÒÙÄËÏÖÜñÑ',
        'aeiouaeiouaeiouAEIOUAEIOUAEIOUnN'
      ),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  )),
  ''
)
WHERE "slug" IS NULL OR btrim("slug") = '';

UPDATE "Programa"
SET "slug" = 'programa'
WHERE "slug" IS NULL OR btrim("slug") = '';

WITH duplicados AS (
  SELECT
    id,
    "slug",
    "codigo",
    row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", id) AS n
  FROM "Programa"
)
UPDATE "Programa" AS programa
SET "slug" = left(
  duplicados."slug" || '-' || lower(regexp_replace(duplicados."codigo", '[^a-zA-Z0-9]+', '-', 'g')),
  160
)
FROM duplicados
WHERE programa.id = duplicados.id
  AND duplicados.n > 1;

WITH duplicados AS (
  SELECT
    id,
    "slug",
    row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", id) AS n
  FROM "Programa"
)
UPDATE "Programa" AS programa
SET "slug" = left(duplicados."slug" || '-' || substr(duplicados.id, 1, 8), 160)
FROM duplicados
WHERE programa.id = duplicados.id
  AND duplicados.n > 1;

ALTER TABLE "Programa" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Programa_slug_key" ON "Programa"("slug");

-- Conserva el vínculo más antiguo de cada par usuario-programa.
DELETE FROM "UsuarioPrograma" AS reciente
USING "UsuarioPrograma" AS previo
WHERE reciente."usuarioId" = previo."usuarioId"
  AND reciente."programaId" = previo."programaId"
  AND (
    reciente."createdAt" > previo."createdAt"
    OR (reciente."createdAt" = previo."createdAt" AND reciente.id > previo.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS "UsuarioPrograma_usuarioId_programaId_key"
  ON "UsuarioPrograma"("usuarioId", "programaId");

DROP INDEX IF EXISTS "UsuarioPrograma_usuarioId_idx";
