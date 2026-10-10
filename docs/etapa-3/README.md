# Etapa 3 — Calidad e integración

> **Sprint PDF:** 3 (08/10 – 18/11/2026)  
> **Historias:** HU-006, HU-007, HU-009  
> **Estado:** En curso — arranque Sprint 3 (HU-009: dashboard Power BI, categoría Estudiantes en `/administrador/dashboard`)

> El estado oficial vive en ClickUp; este repositorio documenta el inicio de la Etapa 3 en código y docs.

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
| GET | `/api/notificaciones` | HU-006/007 |
| GET | `/api/v1/cifras/categorias` | HU-009 (cifras) |
| GET | `/api/v1/cifras/estudiantes?periodo=` | HU-009 (cifras estudiantes) |
| GET | `/api/v1/powerbi/embed-token?categoriaId=estudiantes` | HU-009 |
| CRUD | `/api/estructura/*` | Estructura normativa |

### Variables de entorno — Power BI / cifras (HU-009)

```env
# Azure App Owns Data (producción)
POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
POWERBI_TENANT_ID=
POWERBI_WORKSPACE_ID=
POWERBI_REPORT_ID_ESTUDIANTES=ee3e7c91-76df-4f35-90b6-2e4f67ed6567

# Demo sin Azure: iframe con informe publicado
POWERBI_VISTA_PUBLICA_ESTUDIANTES=https://app.powerbi.com/view?r=eyJrIjoi...
```

Sin `POWERBI_CLIENT_ID`, el backend devuelve `embedUrl` de vista pública y `fallback: true`. El frontend muestra el iframe; si el token falla o no hay URL, consume `GET /cifras/estudiantes` y renderiza Recharts.

### Checklist manual — Dashboard Estudiantes

1. Iniciar sesión como **Administrador** o **Par académico**.
2. Ir a **Dashboard de métricas** → pestaña **Power BI** → tarjeta **Estudiantes**.
3. Verificar iframe del informe (vista publicada en desarrollo).
4. Pulsar **Simular token expirado** → deben aparecer KPIs y gráficos desde la API.
5. **Reintentar carga del informe** → vuelve el iframe.
6. Swagger: probar `GET /api/v1/cifras/estudiantes` con Bearer JWT.

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

Otras suites E2E del cierre del Sprint 2: `vigencias.e2e-spec.ts` (anexos, R-D), `resolucion-men.e2e-spec.ts` (resolución MEN), `limpiar-anexos-sin-documento.e2e-spec.ts` (script de datos), `busqueda.e2e-spec.ts` y `humo.e2e-spec.ts`. Las pruebas del panel en el frontend (T-010.5) usan Vitest + Testing Library (ver `docs/adr/ADR-007-pilas-de-pruebas.md`).

## Incrementos entregados tras el cierre de Etapa 2 (10/10/2026)

No forman parte del checklist de [`etapa-2/README.md`](../etapa-2/README.md); se registran aquí para el arranque del Sprint 3:

| Área | Entrega |
|------|---------|
| HU-010 / panel | Pesos renovación programa G1/G2 **50/50**; avance institucional (`GET /programas/avance-institucional`); ciclo manual `inicioCicloTramiteAt` + `POST …/iniciar-ciclo-renovacion` |
| Alcance institucional | `Usuario.responsableProcesoInstitucional`, G3/G4 por asignación, `GET /institucion/resumen` |
| Admin UX | Métricas sin borradores (validadas / revisión / corrección); hero con avance institucional |
| Revisor | Panel «Mis revisiones» con detalle por programa o institución |

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
