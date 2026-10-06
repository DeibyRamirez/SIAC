# Sprint Review — Sprint 2: Núcleo documental

**Periodo:** 24/09 – 07/10/2026  
**Estado:** En progreso (plantilla pendiente)

> El estado oficial vive en ClickUp; este repositorio no declara sprints completados.

## Historias

| HU | Estado |
|----|--------|
| HU-003 | Alcance original entregado; subtareas nuevas del Sprint 2 pendientes. No se reabre en ClickUp |
| HU-004 | Alcance original entregado; subtareas nuevas pendientes. No se reabre en ClickUp |
| HU-005 | Alcance original entregado; subtareas nuevas pendientes. No se reabre en ClickUp |
| HU-008 | En progreso — búsqueda con `searchVector`, filtros en la URL y visibilidad por rol; pendiente de cierre en ClickUp |
| HU-010 | En progreso (en curso) — panel SSR con n/9, umbrales en BD, resolución MEN, RN-003 por categoría y E2E; pendiente de cierre en ClickUp |

## Definition of Done

- [ ] CRUD end-to-end con restricciones por rol
- [ ] Par académico solo ve documentos validados (RN-001 ajustada)
- [ ] Plantillas versionadas por familia
- [ ] Búsqueda con query params en URL y alcance por rol
- [ ] Panel de programas con semáforo (RN-003) y pruebas E2E en verde en la CI

## Decisiones del PO (06/10/2026)

- G2 y G4 no se puntúan: el Revisor aprueba o deja «Con observaciones»; aportan 0 % hasta aprobarse y el 100 % de su peso después.
- La vigencia inicia con la resolución MEN real (PDF, fecha y número), no con «activar vigencia». Fin = fecha + 7 años; sin resolución = «Sin vigencia» (gris).
- Pruebas: Jest + supertest en el backend y Vitest + RTL en el frontend ([ADR-007](../adr/ADR-007-pilas-de-pruebas.md)).
- El PR #7 se cierra sin merge; lo útil pasa a un PR nuevo desde `develop_v2`.
- Par académico en pausa (T-006.4): sin acceso al panel de programas; el rol y sus datos se conservan.
- Anexos de vigencia: se borran los que no tienen documento (script explícito) y los nuevos exigen documento, evidencia y categoría.
