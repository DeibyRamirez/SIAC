-- HU-010 (cierre del PR #7, auditoría F.3): integridad del propietario de la evidencia.
-- Porta solo las restricciones útiles del PR #7 sobre el modelo Institucion existente
-- (20260928120000_institucion_panel_t010). No crea tablas ni borra datos.
-- Prisma no modela CHECK: se documentan con /// en schema.prisma.

-- 1. Correcciones acotadas de datos heredados (sin efecto si los datos ya cumplen).
-- 1.1 G3/G4 colgados de un «programa de referencia»: pasan a la institución.
UPDATE "Evidencia" AS e
SET "institucionId" = COALESCE(
        e."institucionId",
        (SELECT i."id" FROM "Institucion" AS i ORDER BY i."createdAt" ASC LIMIT 1)
    ),
    "programaId" = NULL
WHERE e."codigoGuia" IN ('G3', 'G4')
  AND e."programaId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Institucion");

-- 1.2 G1/G2 (o sin guía) con los dos propietarios: se conserva el programa.
UPDATE "Evidencia"
SET "institucionId" = NULL
WHERE ("codigoGuia" IS NULL OR "codigoGuia" IN ('G1', 'G2'))
  AND "programaId" IS NOT NULL
  AND "institucionId" IS NOT NULL;

-- 1.3 Un programa no lleva trámites institucionales: se pasa al equivalente de programa.
UPDATE "Programa" SET "tipoTramiteActivo" = 'RegistroCalificadoNuevo'
WHERE "tipoTramiteActivo" = 'CondicionesInstitucionalesNuevas';
UPDATE "Programa" SET "tipoTramiteActivo" = 'RenovacionRegistroCalificado'
WHERE "tipoTramiteActivo" = 'RenovacionCondicionesInstitucionales';

-- 1.4 La institución no lleva trámites de programa: se pasa al equivalente institucional.
UPDATE "Institucion" SET "tipoTramiteActivo" = 'CondicionesInstitucionalesNuevas'
WHERE "tipoTramiteActivo" = 'RegistroCalificadoNuevo';
UPDATE "Institucion" SET "tipoTramiteActivo" = 'RenovacionCondicionesInstitucionales'
WHERE "tipoTramiteActivo" = 'RenovacionRegistroCalificado';

-- 2. Borrar la institución ya no deja evidencias sin propietario (antes SET NULL).
ALTER TABLE "Evidencia" DROP CONSTRAINT "Evidencia_institucionId_fkey";
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_institucionId_fkey"
    FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Restricciones CHECK. Se crean NOT VALID (aplican a toda fila nueva o modificada) y se
--    validan enseguida; si quedara una fila heredada imposible de corregir automáticamente
--    (p. ej. un G1 sin programa), el despliegue no falla: se avisa con WARNING y la
--    restricción queda pendiente de VALIDATE manual tras corregir el dato.
-- 3.1 Exactamente un propietario por evidencia.
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_propietario_unico_chk"
    CHECK (num_nonnulls("programaId", "institucionId") = 1) NOT VALID;

-- 3.2 La guía define el propietario: G1/G2 → programa; G3/G4 → institución.
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_guia_propietario_chk"
    CHECK (
        "codigoGuia" IS NULL
        OR ("codigoGuia" IN ('G1', 'G2') AND "programaId" IS NOT NULL)
        OR ("codigoGuia" IN ('G3', 'G4') AND "institucionId" IS NOT NULL)
    ) NOT VALID;

-- 3.3 Cada entidad solo lleva trámites de su alcance.
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_tramite_alcance_programa_chk"
    CHECK ("tipoTramiteActivo" IN ('RegistroCalificadoNuevo', 'RenovacionRegistroCalificado')) NOT VALID;

ALTER TABLE "Institucion" ADD CONSTRAINT "Institucion_tramite_alcance_institucion_chk"
    CHECK ("tipoTramiteActivo" IN ('CondicionesInstitucionalesNuevas', 'RenovacionCondicionesInstitucionales')) NOT VALID;

DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT * FROM (VALUES
            ('Evidencia', 'Evidencia_propietario_unico_chk'),
            ('Evidencia', 'Evidencia_guia_propietario_chk'),
            ('Programa', 'Programa_tramite_alcance_programa_chk'),
            ('Institucion', 'Institucion_tramite_alcance_institucion_chk')
        ) AS r(tabla, nombre)
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', restriccion.tabla, restriccion.nombre);
        EXCEPTION WHEN check_violation THEN
            RAISE WARNING 'HU-010: % queda NOT VALID; hay filas heredadas que no cumplen. Corrija los datos y ejecute ALTER TABLE "%" VALIDATE CONSTRAINT "%".',
                restriccion.nombre, restriccion.tabla, restriccion.nombre;
        END;
    END LOOP;
END $$;
