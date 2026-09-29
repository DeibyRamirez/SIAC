-- HU-010: entidad Institución para las guías institucionales G3 y G4.
-- Hasta ahora los documentos G3/G4 se colgaban de un "programa de referencia" (2bb18af).
-- Esta migración crea la tabla "Institucion" con el registro único de la CUAC, vuelve
-- opcional "Evidencia"."programaId", agrega "Evidencia"."institucionId" y mueve a la
-- institución las evidencias G3/G4 que ya existían. No edita migraciones aplicadas y es
-- idempotente en los datos (INSERT ... ON CONFLICT y UPDATE acotados).

-- 1. Tabla Institucion.
CREATE TABLE "Institucion" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "sigla" VARCHAR(20) NOT NULL,
    "urlImagen" VARCHAR(500),
    "tipoTramiteActivo" "TipoTramiteSIAC" NOT NULL DEFAULT 'RenovacionCondicionesInstitucionales',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Institucion_sigla_key" ON "Institucion"("sigla");

-- 2. Registro único de la CUAC. Si algún programa tenía activo un trámite institucional
--    (modelo del programa de referencia), la institución hereda el más reciente.
INSERT INTO "Institucion" ("id", "nombre", "sigla", "urlImagen", "tipoTramiteActivo", "createdAt", "updatedAt")
VALUES (
    'institucion-cuac',
    'Corporación Universitaria Autónoma del Cauca',
    'CUAC',
    '/logo-uniautonoma.png',
    COALESCE(
        (
            SELECT p."tipoTramiteActivo"
            FROM "Programa" AS p
            WHERE p."tipoTramiteActivo" IN ('CondicionesInstitucionalesNuevas', 'RenovacionCondicionesInstitucionales')
            ORDER BY p."updatedAt" DESC
            LIMIT 1
        ),
        'RenovacionCondicionesInstitucionales'::"TipoTramiteSIAC"
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("sigla") DO NOTHING;

-- 3. Evidencia: propietario programa o institución.
ALTER TABLE "Evidencia" ADD COLUMN "institucionId" TEXT;
ALTER TABLE "Evidencia" ALTER COLUMN "programaId" DROP NOT NULL;

CREATE INDEX "Evidencia_institucionId_idx" ON "Evidencia"("institucionId");

ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_institucionId_fkey"
    FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Mover los datos G3/G4 del programa de referencia a la institución.
--    Las evaluaciones, versiones e historial cuelgan de la evidencia y no cambian.
UPDATE "Evidencia"
SET "institucionId" = (SELECT i."id" FROM "Institucion" AS i WHERE i."sigla" = 'CUAC'),
    "programaId" = NULL
WHERE "codigoGuia" IN ('G3', 'G4')
  AND "institucionId" IS NULL;

-- 5. Un programa ya no lleva trámites de alcance institucional: se pasa al trámite de
--    programa equivalente (nuevo → registro calificado nuevo; renovación → renovación).
UPDATE "Programa"
SET "tipoTramiteActivo" = 'RegistroCalificadoNuevo'
WHERE "tipoTramiteActivo" = 'CondicionesInstitucionalesNuevas';

UPDATE "Programa"
SET "tipoTramiteActivo" = 'RenovacionRegistroCalificado'
WHERE "tipoTramiteActivo" = 'RenovacionCondicionesInstitucionales';

-- 6. Restricciones de integridad (Prisma no las modela; se documentan en schema.prisma).
-- 6.1 Exactamente un propietario por evidencia.
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_propietario_unico_chk"
    CHECK (num_nonnulls("programaId", "institucionId") = 1);

-- 6.2 La guía define el propietario: G1/G2 → programa; G3/G4 → institución.
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_guia_propietario_chk"
    CHECK (
        "codigoGuia" IS NULL
        OR ("codigoGuia" IN ('G1', 'G2') AND "programaId" IS NOT NULL)
        OR ("codigoGuia" IN ('G3', 'G4') AND "institucionId" IS NOT NULL)
    );

-- 6.3 Cada entidad solo lleva trámites de su alcance.
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_tramite_alcance_programa_chk"
    CHECK ("tipoTramiteActivo" IN ('RegistroCalificadoNuevo', 'RenovacionRegistroCalificado'));

ALTER TABLE "Institucion" ADD CONSTRAINT "Institucion_tramite_alcance_institucion_chk"
    CHECK ("tipoTramiteActivo" IN ('CondicionesInstitucionalesNuevas', 'RenovacionCondicionesInstitucionales'));
