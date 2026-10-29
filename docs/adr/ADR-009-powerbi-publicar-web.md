# ADR-009 — Power BI: «Publicar en la web» ahora, App Owns Data después

**Estado:** Aceptada (provisional hasta tener credenciales Azure)  
**Fecha:** 2026-10-13  
**Historia:** HU-009 (T-009.3; T-009.2 bloqueada)

## Contexto

HU-009 pide mostrar dentro de SIAC los informes Power BI de la Corporación Universitaria Autónoma del Cauca (CUAC / Uniautónoma). El catálogo implementado tiene ocho categorías (`Backend/src/powerbi/categorias-powerbi.ts` y `Frontend/lib/informes-powerbi.ts`): aseguramiento, infraestructura, egresados, investigación, profesores, estudiantes, bienestar y relaciones con el entorno. La opción App Owns Data (T-009.2) necesita un service principal de Azure y capacidad Power BI Embedded, y esas credenciales aún no llegan.

## Opciones

| Criterio | Publicar en la web (`publico`) | App Owns Data (`embebido`) |
|----------|-------------------------------|----------------------------|
| Autenticación | **Ninguna**: cualquiera con la URL ve el informe | Embed token de corta duración emitido por el backend |
| Licencias / Azure | Ninguna adicional | Service principal + capacidad Embedded (costo) |
| Seguridad de filas (RLS) | No soportada | Soportada por programa |
| Esfuerzo | Bajo: iframe + variable de entorno | Alto: endpoint NestJS, renovación de token, `powerbi-client` |
| Datos sensibles | **No apto** | Apto |

## Decisión

- Modo por defecto `POWERBI_MODO=publico`: cada categoría embebe en un iframe la URL de «Publicar en la web» almacenada en `ConfiguracionInformePowerBi`. Solo se aceptan URL que empiezan por `https://app.powerbi.com/view?r=`; el resto se rechaza.
- Las URL no se escriben en el código del frontend ni en variables `NEXT_PUBLIC_*`: el administrador las actualiza en el panel del dashboard y el cliente las obtiene vía `GET /api/v1/powerbi/informes/:categoriaId/url` con JWT de Administrador o SuperAdmin.
- Sin URL, la tarjeta muestra «Informe aún no publicado» con mensaje para el administrador. Si el iframe falla o tarda demasiado, se muestra error y el botón «Reintentar» (sin gráficos nativos de respaldo).
- **Fuente de datos de los informes:** Excel (u origen equivalente) fuera de SIAC → refresco programado en Power BI Service. SIAC **no** almacena filas de cifras institucionales en Postgres; solo las URL de embed en `ConfiguracionInformePowerBi`.
- La pestaña Power BI solo la ven Administrador y SuperAdmin.
- La CSP del frontend solo agrega `frame-src 'self' https://app.powerbi.com`.
- `POWERBI_MODO=embebido` conserva la ruta simulada actual (`/powerbi/embed-token`).
- El token real (App Owns Data) queda detrás del interruptor `powerbi_embed_habilitado` en `ConfiguracionSIAC`, apagado por defecto. Apagado, el dashboard público no cambia. Encendido y con `POWERBI_TENANT_ID`, `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET` más los id de área de trabajo e informe del panel, `GET /api/v1/powerbi/token-insercion` emite un token de solo lectura de máximo 60 minutos. El secreto no sale del backend ni se escribe en el repositorio.

## Advertencia de seguridad

**«Publicar en la web» hace público el informe en internet, sin autenticación.** Restringir la pestaña en SIAC por rol no protege los datos: quien tenga la URL puede abrir el informe (la URL solo la reciben sesiones de administrador vía API, no el bundle estático). Solo se deben publicar informes con datos agregados, anonimizados y autorizados para difusión pública. Cualquier dato personal o sensible exige App Owns Data.

## Consecuencias

- Integración inmediata sin costo de Azure; riesgo de exposición aceptado solo para datos públicos.
- Al llegar las credenciales, T-009.2 implementa el token real detrás de `POWERBI_MODO=embebido` sin cambiar el catálogo ni las tarjetas.
- Ingesta por API hacia informes Power BI (Camino 2) queda replanteada en [ADR-010](ADR-010-camino-2-api-cifras-institucionales.md): validación en SIAC y escritura al Excel maestro, sin réplica en Postgres.
