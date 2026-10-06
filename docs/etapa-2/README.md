# Etapa 2 — Núcleo documental

> **Sprint PDF:** 2 (24/09 – 07/10/2026)  
> **Historias:** HU-003 cierre, HU-004, HU-005, HU-008, HU-010  
> **Estado:** En progreso

> El estado oficial vive en ClickUp; este repositorio no declara sprints completados. HU-008 y HU-010 siguen por hacer. HU-003, HU-004 y HU-005 no se reabren: sus subtareas nuevas son ajustes del Sprint 2.

## Objetivo

CRUD completo de evidencias y plantillas, búsqueda con filtros en URL y panel de programas con semáforo agregado.

## Entregables

### Backend

- **HU-003 cierre:** Validación tipos/tamaño archivo (PDF/Excel, max 20MB)
- **HU-004:** CRUD evidencias con restricciones (solo autor edita borrador; 403 en Validado)
- **HU-005:** Versionado plantillas (marca anteriores como no vigentes)
- **HU-008:** `BusquedaModule` — full-text search PostgreSQL + query params
- **HU-010:** `ProgramasModule` — agregaciones semáforo por programa (RN-003)

### Frontend

- Servicios API: evidencias, plantillas, programas, búsqueda
- `ProveedorAlmacen` sincroniza con API al cargar
- Dictaminar evidencia llama API cuando disponible

## Endpoints

| Método | Ruta | HU |
|--------|------|-----|
| GET/PATCH/DELETE | `/api/evidencias/:id` | HU-004 |
| GET | `/api/evidencias/:id/descargar` | HU-004 |
| GET/POST/PATCH/DELETE | `/api/plantillas` | HU-005 |
| GET | `/api/plantillas/:id/descargar` | HU-005 |
| GET | `/api/busqueda?q=&programaId=&codigoGuia=&periodo=&estado=&formato=` | HU-008 |
| GET | `/api/programas` | HU-010 |
| GET | `/api/programas/:id` | HU-010 |

## Clasificación de documentos (T-REF-001)

- El Documento Maestro reúne las 9 condiciones de programa en **un solo archivo** (G1); el institucional reúne las 6 condiciones institucionales (G3). No existe un archivo por condición.
- Por eso se retiraron `Evidencia.factor`, `Evidencia.indicador` y `Plantilla.factor` (migración `20260930010000_eliminar_factor_indicador`). Los documentos se clasifican por `codigoGuia` (G1–G4), `programaId`, `periodo` y `estado`.
- Las condiciones siguen como catálogo cerrado (enums `CodigoCondicionDocumentoMaestro` y `CodigoCondicionInstitucional`) y se evalúan solo en el checklist del dictamen, que produce el puntaje n/9 o n/6.
- Filtros HU-008: `programaId`, `codigoGuia`, `periodo`, `estado` y texto libre `q` (nombre, archivo, periodo; `q=G1` también filtra por guía). `GET /evidencias` acepta el mismo `codigoGuia`.
- Plantillas (HU-005): `codigoGuia` es obligatorio; una plantilla nueva desactiva las vigentes de la misma guía y tipo de trámite.
- Ingesta Excel: columnas `nombre`, `programaCodigo`, `periodo`, `codigoGuia`.

## Pruebas (T-010.4 y T-010.5)

- **T-010.5 (criterio ajustado por el PO, 06/10):** el backend usa Jest + supertest (`pnpm exec jest` y `pnpm test:e2e` con PostgreSQL y Storage en memoria) y el frontend usa Vitest + React Testing Library (`pnpm test`). Las dos suites corren en la CI en cada push y PR a `develop_v2`. Decisión registrada en [ADR-007](../adr/ADR-007-pilas-de-pruebas.md).
- **T-010.4:** casos CP-E2E-01 a CP-E2E-05 en `Backend/test/e2e/flujo-carga-panel.e2e-spec.ts`, documentados en [Etapa 3](../etapa-3/README.md).

## Criterios de aceptación

- [x] CRUD evidencias end-to-end con restricciones por rol
- [x] Plantillas versionadas; Cargador solo descarga vigentes
- [x] Búsqueda con filtros query params
- [x] Panel programas con semáforo (RN-003: infra vencido → rojo)
- [x] Par académico no accede a borradores (API 403)

## Regla de negocio RN-003

Programa con anexo de infraestructura vencido → semáforo **Rojo** en panel.
