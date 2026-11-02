-- HU-009: interruptor de inserción de Power BI y los identificadores del informe.
-- No son secretos. El secreto de la entidad de servicio vive solo en el entorno
-- (POWERBI_TENANT_ID, POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET).
--
-- No se otorgan estas columnas a siac_powerbi_lectura. Ese rol sigue con GRANT
-- solo sobre id, aniosVigencia, mesesAvisoVigencia y mesesRojoVigencia, que es
-- lo que lee v_powerbi_puntajes. siac_app ya tiene privilegio a nivel de tabla,
-- así que ve las columnas nuevas. Las políticas RLS de ConfiguracionSIAC no cambian:
-- leer exige un rol de sesión; escribir, gestión (Administrador o SuperAdmin) o sistema.

ALTER TABLE "ConfiguracionSIAC"
  ADD COLUMN "powerbi_embed_habilitado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "powerbiWorkspaceId" VARCHAR(36),
  ADD COLUMN "powerbiReportId" VARCHAR(36);
