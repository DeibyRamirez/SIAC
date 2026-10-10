-- Ciclo de trámite por programa: solo evidencias desde inicioCicloTramiteAt cuentan en el avance.

ALTER TABLE "Programa" ADD COLUMN "inicioCicloTramiteAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Programa" SET "inicioCicloTramiteAt" = "createdAt";
