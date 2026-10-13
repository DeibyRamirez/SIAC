# ADR-009 — Power BI: «Publicar en la web» ahora, App Owns Data después

**Estado:** Aceptada (provisional hasta tener credenciales Azure)  
**Fecha:** 2026-10-13  
**Historia:** HU-009 (T-009.3; T-009.2 bloqueada)

## Contexto

HU-009 pide mostrar dentro de SIAC seis informes Power BI con datos de Unicauca: aseguramiento, infraestructura, egresados, investigación, profesores y estudiantes. La opción App Owns Data (T-009.2) necesita un service principal de Azure y capacidad Power BI Embedded, y esas credenciales aún no llegan.

## Opciones

| Criterio | Publicar en la web (`publico`) | App Owns Data (`embebido`) |
|----------|-------------------------------|----------------------------|
| Autenticación | **Ninguna**: cualquiera con la URL ve el informe | Embed token de corta duración emitido por el backend |
| Licencias / Azure | Ninguna adicional | Service principal + capacidad Embedded (costo) |
| Seguridad de filas (RLS) | No soportada | Soportada por programa |
| Esfuerzo | Bajo: iframe + variable de entorno | Alto: endpoint NestJS, renovación de token, `powerbi-client` |
| Datos sensibles | **No apto** | Apto |

## Decisión

- Modo por defecto `POWERBI_MODO=publico`: cada categoría embebe en un iframe la URL de «Publicar en la web» definida en `NEXT_PUBLIC_POWERBI_URL_<CATEGORÍA>`. Solo se aceptan URL que empiezan por `https://app.powerbi.com/view?r=`; el resto se rechaza.
- Las URL no se escriben en el código ni se commitean: `.env.example` las deja vacías.
- Sin URL, la tarjeta muestra «Informe aún no publicado» y el respaldo Recharts si existe (hoy solo Estudiantes). Si el iframe falla o tarda demasiado, se muestra el respaldo y el botón «Reintentar».
- La pestaña Power BI solo la ven Administrador y SuperAdmin.
- La CSP del frontend solo agrega `frame-src 'self' https://app.powerbi.com`.
- `POWERBI_MODO=embebido` conserva la ruta simulada actual (`/powerbi/embed-token`) y queda bloqueado hasta tener las credenciales Azure; no se construye el token real.

## Advertencia de seguridad

**«Publicar en la web» hace público el informe en internet, sin autenticación.** Restringir la pestaña en SIAC por rol no protege los datos: quien tenga la URL (o la vea en el código del navegador, porque las variables `NEXT_PUBLIC_*` se incrustan en el bundle) puede abrir el informe. Solo se deben publicar informes con datos agregados, anonimizados y autorizados para difusión pública. Cualquier dato personal o sensible exige App Owns Data.

## Consecuencias

- Integración inmediata sin costo de Azure; riesgo de exposición aceptado solo para datos públicos.
- Al llegar las credenciales, T-009.2 implementa el token real detrás de `POWERBI_MODO=embebido` sin cambiar el catálogo ni las tarjetas.
