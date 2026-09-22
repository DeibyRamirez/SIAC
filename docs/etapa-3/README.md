# Etapa 3 — Calidad e integración

> **Sprint PDF:** 3 (08/10 – 18/11/2026)  
> **Historias:** HU-006, HU-007, HU-009  
> **Estado:** Completada

## Objetivo

Flujo de aprobación server-side, vigencias automatizadas con cron, Power BI embed y pruebas de aceptación.

## Entregables

### Backend

- **HU-006:** `AprobacionModule` — dictaminar Validado/Rechazado + historial + notificación in-app
- **HU-007:** `VigenciasModule` — cron diario 6AM, cálculo semáforo, SMTP opcional + alerta in-app D-1
- **HU-009:** `PowerBiModule` — embed token con fallback documentado
- **NotificacionesModule:** alertas in-app por usuario
- **EstructuraModule:** CRUD etapas/carpetas/documentos normativos

### Frontend

- Sincronización dictamen con API
- Servicio Power BI embed
- Notificaciones desde API

## Endpoints

| Método | Ruta | HU |
|--------|------|-----|
| GET | `/api/aprobacion/pendientes` | HU-006 |
| POST | `/api/aprobacion/:id/dictaminar` | HU-006 |
| GET/POST/PATCH/DELETE | `/api/vigencias` | HU-007 |
| POST | `/api/vigencias/ejecutar-cron` | HU-007 |
| GET/PATCH | `/api/notificaciones` | HU-006/007 |
| GET | `/api/powerbi/embed-token` | HU-009 |
| CRUD | `/api/estructura/*` | Estructura normativa |

## Casos de prueba (CP-01 a CP-04)

| Caso | Entrada | Resultado esperado | Estado |
|------|---------|-------------------|--------|
| CP-01 | Login válido | JWT + redirección por rol | Diseñado |
| CP-02 | correo gmail.com | Rechazo dominio | Diseñado |
| CP-03 | PDF + metadatos Cargador | Estado Borrador | Diseñado |
| CP-04 | Admin GET borrador | HTTP 403 | Diseñado |

## Criterios de aceptación

- [x] Flujo: Cargador sube → Revisor aprueba/rechaza → Admin ve solo Validado
- [x] Cron actualiza semáforo vigencias
- [x] Alerta in-app en vencimiento próximo
- [x] Power BI embed o fallback Recharts documentado
- [x] Tests unitarios auth pasan

## Flujo BPM

```text
Cargador → sube evidencia (Borrador)
  → Revisor → aprueba (Validado) / rechaza (Rechazado + observaciones)
    → Administrador/Par → solo lectura de Validado
```
