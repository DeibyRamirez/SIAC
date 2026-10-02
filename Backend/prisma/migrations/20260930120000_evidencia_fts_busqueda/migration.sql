-- HU-008 T-008.1: full-text search en Evidencia (unaccent + tsvector + GIN)

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT unaccent('unaccent', $1)
$$;

ALTER TABLE "Evidencia"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector
GENERATED ALWAYS AS (
  to_tsvector(
    'spanish',
    f_unaccent(
      coalesce("nombre", '') || ' ' ||
      coalesce("periodo", '') || ' ' ||
      coalesce("nombreArchivo", '')
    )
  )
) STORED;

CREATE INDEX IF NOT EXISTS "Evidencia_searchVector_idx"
ON "Evidencia" USING GIN ("searchVector");
