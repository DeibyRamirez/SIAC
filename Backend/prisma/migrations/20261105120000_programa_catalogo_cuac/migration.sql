-- Campos del catálogo oficial CUAC persistidos por programa (stale-while-revalidate).
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "codigoCu" VARCHAR(20);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "tituloCuac" VARCHAR(200);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "duracionCuac" VARCHAR(40);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "creditosCuac" INTEGER;
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "resolucionCuac" VARCHAR(30);
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "fechaResolucionCuac" DATE;
ALTER TABLE "Programa" ADD COLUMN IF NOT EXISTS "imagenSlugCuac" VARCHAR(80);

ALTER TABLE "Institucion" ADD COLUMN IF NOT EXISTS "versionCatalogoCuac" VARCHAR(20);
ALTER TABLE "Institucion" ADD COLUMN IF NOT EXISTS "catalogoCuacActualizadoEn" TIMESTAMP(3);
