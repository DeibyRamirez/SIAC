-- Corrige pesoPorcentaje en TramiteDocumentoGuia: la migración 20260929010000 insertó
-- filas con el default 100 %, dejando trámites de 2 guías en 200 % total.
-- Pesos T-010.2 (deben sumar 100 % por trámite).

UPDATE "TramiteDocumentoGuia" tdg
SET "pesoPorcentaje" = sub.peso
FROM (
  SELECT tdg2.id,
    CASE
      WHEN t.tipo = 'RegistroCalificadoNuevo' AND tdg2."codigoGuia" = 'G1' THEN 100
      WHEN t.tipo = 'RenovacionRegistroCalificado' AND tdg2."codigoGuia" = 'G1' THEN 90
      WHEN t.tipo = 'RenovacionRegistroCalificado' AND tdg2."codigoGuia" = 'G2' THEN 10
      WHEN t.tipo = 'CondicionesInstitucionalesNuevas' AND tdg2."codigoGuia" = 'G3' THEN 100
      WHEN t.tipo = 'RenovacionCondicionesInstitucionales' AND tdg2."codigoGuia" = 'G3' THEN 85
      WHEN t.tipo = 'RenovacionCondicionesInstitucionales' AND tdg2."codigoGuia" = 'G4' THEN 15
      ELSE tdg2."pesoPorcentaje"
    END AS peso
  FROM "TramiteDocumentoGuia" tdg2
  JOIN "TramiteSIAC" t ON t.id = tdg2."tramiteId"
) sub
WHERE tdg.id = sub.id;
