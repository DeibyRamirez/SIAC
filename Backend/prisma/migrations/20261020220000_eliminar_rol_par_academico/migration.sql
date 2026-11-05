-- Eliminación del rol Par académico (decisión del 20/10/2026; T-006.4 descartada).
--
-- 1) Los usuarios con rol ParAcademico se DESACTIVAN (activo = false: no pueden iniciar sesión)
--    y pasan al rol Cargador, el de menor privilegio que existe: sin asignaciones de programa no
--    ve ningún programa ni evidencia. No se borra ningún usuario, para no romper referencias
--    (autoría, historial, alertas, outbox) ni perder datos de evidencias.
-- 2) Se recrea el enum "RolUsuario" sin el valor (PostgreSQL no permite quitar valores de un enum).
--    "Usuario"."rol" es la única columna de ese tipo y no tiene valor por defecto.

UPDATE "Usuario"
SET "activo" = false,
    "rol" = 'Cargador',
    "updatedAt" = NOW()
WHERE "rol" = 'ParAcademico';

ALTER TYPE "RolUsuario" RENAME TO "RolUsuario_old";
CREATE TYPE "RolUsuario" AS ENUM ('Cargador', 'Revisor', 'Administrador', 'SuperAdmin');
ALTER TABLE "Usuario"
  ALTER COLUMN "rol" TYPE "RolUsuario" USING ("rol"::text::"RolUsuario");
DROP TYPE "RolUsuario_old";
