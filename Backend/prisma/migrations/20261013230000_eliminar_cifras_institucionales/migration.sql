-- Retirada almacén local de cifras (Camino 1: datos en Excel externo → Power BI).
-- Se conserva ConfiguracionInformePowerBi.

DROP TABLE IF EXISTS "CifraIndicador";
DROP TABLE IF EXISTS "RegistroEstudiante";
DROP TABLE IF EXISTS "RegistroProfesor";
DROP TABLE IF EXISTS "RegistroEgresado";
DROP TABLE IF EXISTS "RegistroSemillero";
DROP TABLE IF EXISTS "ProgramaAseguramiento";
DROP TABLE IF EXISTS "SedeInfraestructura";
DROP TABLE IF EXISTS "CargaCifras";
DROP TABLE IF EXISTS "VariableCifra";

DROP TYPE IF EXISTS "FuenteCifra";
