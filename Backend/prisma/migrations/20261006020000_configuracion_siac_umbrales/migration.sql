-- T-010.2 (R-010.2a): umbrales de semáforo configurables en BD (antes constantes en el código).
-- Fila única 'global' con los valores vigentes: avance verde ≥ 100 %, amarillo ≥ 55 %;
-- vigencia de 7 años con aviso amarillo 12 meses antes del fin (desde el año 6).
CREATE TABLE IF NOT EXISTS "ConfiguracionSIAC" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "avanceMinimoVerde" INTEGER NOT NULL DEFAULT 100,
    "avanceMinimoAmarillo" INTEGER NOT NULL DEFAULT 55,
    "aniosVigencia" INTEGER NOT NULL DEFAULT 7,
    "mesesAvisoVigencia" INTEGER NOT NULL DEFAULT 12,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracionSIAC_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ConfiguracionSIAC" ("id", "avanceMinimoVerde", "avanceMinimoAmarillo", "aniosVigencia", "mesesAvisoVigencia", "updatedAt")
VALUES ('global', 100, 55, 7, 12, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
