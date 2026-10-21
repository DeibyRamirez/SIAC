-- Umbrales del semáforo de vigencia de la resolución MEN: amarillo 12 meses antes del fin y rojo
-- 6 meses antes (antes 24/18, migración 20261016120000_t007_3_umbrales_outbox).
-- Cambiar el @default no basta: la fila 'global' ya existe en las BD desplegadas (Supabase), así
-- que se actualiza explícitamente. Si el administrador había personalizado los valores, esta
-- migración los reemplaza por la regla vigente; después se pueden volver a editar con
-- PATCH /api/v1/configuracion/vigencia.

ALTER TABLE "ConfiguracionSIAC"
  ALTER COLUMN "mesesAvisoVigencia" SET DEFAULT 12,
  ALTER COLUMN "mesesRojoVigencia" SET DEFAULT 6;

UPDATE "ConfiguracionSIAC"
SET "mesesAvisoVigencia" = 12,
    "mesesRojoVigencia" = 6,
    "updatedAt" = NOW()
WHERE "id" = 'global';
