-- T-010.2: renovación de registro calificado — G1 y G2 al 50 % cada uno.

UPDATE "TramiteDocumentoGuia" tdg
SET "pesoPorcentaje" = sub.peso
FROM (
  SELECT tdg2.id,
    CASE
      WHEN t.tipo = 'RenovacionRegistroCalificado' AND tdg2."codigoGuia" = 'G1' THEN 50
      WHEN t.tipo = 'RenovacionRegistroCalificado' AND tdg2."codigoGuia" = 'G2' THEN 50
      ELSE tdg2."pesoPorcentaje"
    END AS peso
  FROM "TramiteDocumentoGuia" tdg2
  JOIN "TramiteSIAC" t ON t.id = tdg2."tramiteId"
) sub
WHERE tdg.id = sub.id;
