# Etapa 3 — Calidad e integración

> **Sprint PDF:** 3 (08/10 – 18/11/2026)  
> **Historias:** HU-006, HU-007, HU-009  
> **Estado:** Por hacer

> El estado oficial vive en ClickUp; este repositorio no declara sprints completados.

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

## Pruebas E2E del flujo de carga y panel (CP-E2E-01 a CP-E2E-05, T-010.4)

Archivo: `Backend/test/e2e/flujo-carga-panel.e2e-spec.ts` (Jest + supertest contra la API completa, PostgreSQL local o de CI y Storage en memoria). Se ejecutan con `pnpm test:e2e` en la CI (job *Backend CI*).

| Caso | Entrada | Resultado esperado | Estado |
|------|---------|-------------------|--------|
| CP-E2E-01 | Cargador sube un .docx G1 de Derecho (programa nuevo), lo envía; el Revisor marca 5 de 9 condiciones | El Admin ve la evidencia «ConObservaciones», G1 `5/9` en el panel, avance 55,56 % y `semaforoAvance = Amarillo` (umbrales por defecto 55/100 de `ConfiguracionSIAC`) | Automatizado |
| CP-E2E-02 | PDF renombrado a `.docx` | HTTP 400 (no es un ZIP de Word) | Automatizado |
| CP-E2E-03 | Revisor asignado a otro programa dictamina la evidencia de Derecho | HTTP 403 | Automatizado |
| CP-E2E-04 | Borrador nunca enviado | No aparece en `GET /evidencias` del Admin y su detalle responde 403/404 | Automatizado |
| CP-E2E-05 | Anexo de categoría Infraestructura vencido (01/09/2026) vinculado a la G1 | `anexoInfraestructuraVencido = true` y `semaforoGeneral = Rojo` (RN-003) | Automatizado |

Otras suites E2E del cierre del Sprint 2: `vigencias.e2e-spec.ts` (anexos, R-D), `resolucion-men.e2e-spec.ts` (resolución MEN), `limpiar-anexos-sin-documento.e2e-spec.ts` (script de datos), `busqueda.e2e-spec.ts` y `humo.e2e-spec.ts`. Las pruebas del panel en el frontend (T-010.5) usan Vitest + Testing Library (ver `docs/adr/0001-pilas-de-pruebas.md`).

## Criterios de aceptación

- [ ] Flujo: Cargador sube → Revisor aprueba/rechaza → Admin ve solo Validado
- [ ] Cron actualiza semáforo vigencias
- [ ] Alerta in-app en vencimiento próximo
- [ ] Power BI embed o fallback Recharts documentado
- [ ] Tests unitarios auth pasan

## Flujo BPM

```text
Cargador → sube evidencia (Borrador)
  → Revisor → aprueba (Validado) / rechaza (Rechazado + observaciones)
    → Administrador/Par → solo lectura de Validado
```
