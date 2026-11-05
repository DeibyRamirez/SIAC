# Power BI en SIAC — reportEmbed y modo Azure (App Owns Data)

## Modo operativo actual

Los dashboards del administrador usan **solo** enlaces `https://app.powerbi.com/reportEmbed?…` guardados en `ConfiguracionInformePowerBi` (panel «Actualizar informes Power BI»). El usuario debe iniciar sesión en Microsoft, tener licencia Power BI Pro y acceso al área de trabajo SIAC.

No se acepta «Publicar en la web» (`/view?r=`). Las URL antiguas de ese tipo siguen en base de datos hasta que un administrador las sustituya; el CRUD las rechaza al guardar.

## Modo Azure desactivado (token de inserción)

El backend conserva el módulo **App Owns Data** (`TokenInsercionPowerBiService`, rutas `/api/v1/powerbi/insercion`, `/powerbi/token-insercion`, `/powerbi/probar-conexion`). Por defecto:

- `ConfiguracionSIAC.powerbiEmbedHabilitado` = `false`
- Sin variables `POWERBI_*` de Azure el arranque **no falla**; las rutas responden «configuración incompleta» o «deshabilitado» según el caso.

El panel del frontend para el interruptor «Insertar informe con token» fue retirado; la reactivación es vía API y variables de entorno cuando TI lo apruebe.

### Variables de entorno (servidor NestJS)

| Variable | Uso |
|----------|-----|
| `POWERBI_TENANT_ID` | GUID del inquilino Azure AD |
| `POWERBI_CLIENT_ID` | GUID de la aplicación (entidad de servicio) |
| `POWERBI_CLIENT_SECRET` | Secreto de la aplicación (nunca en el cliente ni en el repositorio) |

Opcionales para pruebas o rutas legacy simuladas (no necesarias para reportEmbed):

- `POWERBI_WORKSPACE_ID`, `POWERBI_REPORT_ID`, `POWERBI_REPORT_ID_ESTUDIANTES`
- `POWERBI_URL_PUBLICA_ESTUDIANTES` — solo si es `reportEmbed` válido; respaldo env antes del CRUD en BD

Los **id de área de trabajo e informe** para el token viven en la tabla `ConfiguracionSIAC` (`powerbiWorkspaceId`, `powerbiReportId`), no en `.env`.

### Reactivar el camino Azure (checklist TI)

1. Registrar la aplicación en Azure AD con permisos de Power BI (Generate Embed Token).
2. Definir las tres variables `POWERBI_TENANT_ID`, `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET` en el entorno del backend (Render u otro).
3. Como **Administrador** o **SuperAdmin**, llamar `PATCH /api/v1/powerbi/insercion` con `workspaceId`, `reportId` (UUID) y `habilitado: true`.
4. Verificar con `POST /api/v1/powerbi/probar-conexion` (no devuelve el token).
5. Consumir el informe con `GET /api/v1/powerbi/token-insercion` desde un cliente que use el SDK (`powerbi-client`); el frontend actual no incluye UI para este flujo.

Para volver a desactivar: `PATCH` con `habilitado: false` o vaciar credenciales Azure.

Referencia normativa: ADR-009 (reportEmbed) y backlog HU-009 en `docs/etapa-3/`.
