# ADR-008 — Canal de correo Resend (dev) y SMTP (prod)

**Estado:** Aceptada  
**Fecha:** 2026-10-09

## Contexto

SIAC debe notificar por correo en paralelo a las alertas in-app (ADR-006). En desarrollo el equipo usa Resend; en el despliegue universitario el envío es por servidor SMTP institucional.

## Decisión

- Puerto `ProveedorCorreo` con adaptadores **Resend**, **SMTP** (nodemailer) y **nulo**.
- Variable `CORREO_CANAL`: `resend` | `smtp` | `ninguno` (con inferencia por `RESEND_API_KEY` / `SMTP_HOST`).
- `NotificacionesDespachoService` crea `AlertaInApp` y encola el mismo mensaje por correo para el `correo` del usuario (ver la enmienda: el correo ya no se envía dentro de la petición).
- Fallos de correo no revierten la operación de negocio; quedan en la bitácora del outbox (`NotificacionSalida`).

## Consecuencias

- Módulo `Backend/src/correo/` desacoplado de vigencias y documentos.
- Producción: `CORREO_CANAL=smtp` y credenciales SMTP de TI.
- Desarrollo: `CORREO_CANAL=resend` y `RESEND_API_KEY`.

## Enmienda (20/10/2026) — Cola de correo (outbox) con deduplicación y reintentos

Verificado contra el código de `develop_v2` (`983cc63`). Sustituye el envío directo desde la petición.

### Implementado

- **Tabla `NotificacionSalida`** (`Backend/prisma/schema.prisma`): `claveEvento` **única**, `usuarioId` opcional, `destinatarioCorreo`, `canal` (`correo`), `tipo`, `payload` JSON con el mensaje ya renderizado (no se expone en la API), `estado` (`Pendiente` | `Enviado` | `Fallido` | `Descartado`), `intentos`, `ultimoError`, `proximoIntentoAt` y `enviadoAt`. Índices por `(estado, proximoIntentoAt)` y por `usuarioId`.
- **Encolado transaccional y deduplicado** (`NotificacionesDespachoService`): la `AlertaInApp` y la fila de outbox se crean en la misma transacción que el evento de negocio (o en una propia). La deduplicación es por `claveEvento` (`AlertaInApp.claveEvento` también es única): si ya existe se omite, y una carrera que choque con la restricción única (`P2002`) se trata como «ya notificado». Las claves las construye `notificaciones/claves-evento.ts` (`dictamen:{evidencia}:v{n}:{usuario}`, vigencia, anexo D-1, revisión pendiente, avance). Los responsables externos sin cuenta solo reciben la fila de outbox (`encolarCorreoExterno`).
- **Procesador con reintentos** (`ProcesadorNotificacionesSalidaService`): `@Cron` cada minuto dentro del proceso NestJS; toma un lote de filas `Pendiente` con `proximoIntentoAt <= ahora`. Cada fila se **reclama** con un `updateMany` condicionado a `estado` e `intentos` (seguro con varias instancias) que incrementa `intentos` y mueve `proximoIntentoAt` un *lease* (`CORREO_LEASE_SEGUNDOS`, 300 s). Si el envío falla: `ultimoError` y backoff exponencial `CORREO_REINTENTO_BASE_SEGUNDOS · 2^(n-1)`; al llegar a `CORREO_MAX_INTENTOS` (3) queda `Fallido`. La alerta in-app nunca se revierte.
- **Lista blanca fuera de producción:** un destinatario fuera de `CORREO_DESTINATARIOS_PERMITIDOS` queda `Descartado`.
- **Bitácora:** `GET /api/v1/notificaciones/salida?estado=&page=&limit=` (Administrador y SuperAdmin), sin el `payload`.
- **Plantillas de correo** HTML y texto por tipo de evento en `Backend/src/correo/plantillas/` (con *snapshots*).
- Pruebas: specs del despacho y del procesador, E2E `notificaciones` y `alertas-vigencia`.

### Planificado (no implementado)

- Pantalla en el frontend para la bitácora del outbox y reenvío manual de filas `Fallido` (hoy solo existe el endpoint).
- Preferencias de notificación por usuario (C-7).
- Purga o archivo de filas `Enviado` antiguas: hoy la tabla crece sin límite.
- Envío real por SMTP institucional: depende de las credenciales de TI (en producción se usa Resend).

### Consecuencias de la enmienda

- El correo depende de que el proceso esté despierto: en Render free el procesador solo corre mientras el servicio no duerme (ver `docs/despliegue.md` §2.1).
- Con `CORREO_CANAL=ninguno` las filas se crean igual y el proveedor nulo no envía nada, pero el procesador las marca `Enviado`: en la bitácora, `Enviado` con canal `ninguno` no significa que el correo saliera.
