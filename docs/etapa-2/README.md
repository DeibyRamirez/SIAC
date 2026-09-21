# Etapa 2 — Núcleo documental

> **Sprint PDF:** 2 (24/09 – 07/10/2026)  
> **Historias:** HU-003 cierre, HU-004, HU-005, HU-008, HU-010  
> **Estado:** Completada

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
| GET | `/api/busqueda?q=&programaId=&factor=` | HU-008 |
| GET | `/api/programas` | HU-010 |
| GET | `/api/programas/:id` | HU-010 |

## Criterios de aceptación

- [x] CRUD evidencias end-to-end con restricciones por rol
- [x] Plantillas versionadas; Cargador solo descarga vigentes
- [x] Búsqueda con filtros query params
- [x] Panel programas con semáforo (RN-003: infra vencido → rojo)
- [x] Par académico no accede a borradores (API 403)

## Regla de negocio RN-003

Programa con anexo de infraestructura vencido → semáforo **Rojo** en panel.
