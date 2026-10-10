-- estadoProceso: nuevo valor por defecto 'En progreso' y actualizacion de filas existentes
-- AlterTable
ALTER TABLE "Programa" ALTER COLUMN "estadoProceso" SET DEFAULT 'En progreso';

UPDATE "Programa" SET "estadoProceso" = 'En progreso' WHERE "estadoProceso" = 'En curso';
