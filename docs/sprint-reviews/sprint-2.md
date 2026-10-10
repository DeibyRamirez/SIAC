# Sprint Review — Sprint 2: Núcleo documental

**Periodo:** 24/09 – 07/10/2026 (cierre en repo: 09/10/2026)  
**Estado:** Completada  
**Verificación cierre (10/10/2026):** gate técnico local alineado con `.github/workflows/ci.yml` — `prisma migrate deploy`, Jest (187), E2E (34, incl. CP-E2E-01..05 y `busqueda.e2e-spec.ts`), Vitest (51), `nest build` y `next build`. ClickUp: marcar Sprint 2 / HU-003..010 como Done (acción manual del PO).

## Historias

| HU | Estado |
|----|--------|
| HU-003 | Cerrada — carga `.docx`, metadatos, envío a revisión, validación 20 MB |
| HU-004 | Cerrada — CRUD con restricciones por rol y estado |
| HU-005 | Cerrada — biblioteca versionada; Cargador solo vigentes |
| HU-008 | Cerrada — búsqueda FTS, filtros en URL, columna «Nivel», export CSV |
| HU-010 | Cerrada — panel SSR `/programas/panel`, RN-003, semáforos con etiquetas de negocio |

## Definition of Done

- [x] CRUD end-to-end con restricciones por rol
- [x] Par académico solo ve documentos validados (RN-001 ajustada)
- [x] Plantillas versionadas por familia
- [x] Búsqueda con query params en URL y alcance por rol
- [x] Panel de programas con semáforo (RN-003) y pruebas E2E en la CI

## Decisiones del PO (06/10/2026)

- G2 y G4 no se puntúan: el Revisor aprueba o deja «Con observaciones»; aportan 0 % hasta aprobarse y el 100 % de su peso después.
- La vigencia inicia con la resolución MEN real (PDF, fecha y número), no con «activar vigencia». Fin = fecha + 7 años; sin resolución = «Sin vigencia» (gris).
- Pruebas: Jest + supertest en el backend y Vitest + RTL en el frontend ([ADR-007](../adr/ADR-007-pilas-de-pruebas.md)).
- Par académico en pausa (T-006.4): sin acceso al panel de programas; el rol y sus datos se conservan.
- Anexos de vigencia: script explícito de limpieza; los nuevos exigen documento, evidencia y categoría.
- UI (09/10): los semáforos se muestran con **color + etiqueta de negocio** («Vigente», «En progreso», «Vencida», etc.), no con los nombres de color en pantalla.

## Incremento entregado (resumen)

- Backend: `BusquedaModule`, `GET /programas/panel`, `ConfiguracionSIAC`, resolución MEN, categorías de anexo.
- Frontend: búsqueda SSR, panel de programas, utilidad `etiquetas-semaforo.ts`, tests Vitest actualizados.
- E2E: CP-E2E-01 a CP-E2E-05 y suite `busqueda.e2e-spec.ts`.
