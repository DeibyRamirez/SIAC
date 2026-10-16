# ADR-008 — Canal de correo Resend (dev) y SMTP (prod)

**Estado:** Aceptada  
**Fecha:** 2026-10-09

## Contexto

SIAC debe notificar por correo en paralelo a las alertas in-app (ADR-006). En desarrollo el equipo usa Resend; en el despliegue universitario el envío es por servidor SMTP institucional.

## Decisión

- Puerto `ProveedorCorreo` con adaptadores **Resend**, **SMTP** (nodemailer) y **nulo**.
- Variable `CORREO_CANAL`: `resend` | `smtp` | `ninguno` (con inferencia por `RESEND_API_KEY` / `SMTP_HOST`).
- `NotificacionesDespachoService` crea `AlertaInApp` y replica el mismo mensaje por correo al `correo` del usuario.
- Fallos de correo no revierten la operación de negocio; se registran en log.

## Consecuencias

- Módulo `Backend/src/correo/` desacoplado de vigencias y documentos.
- Producción: `CORREO_CANAL=smtp` y credenciales SMTP de TI.
- Desarrollo: `CORREO_CANAL=resend` y `RESEND_API_KEY`.
