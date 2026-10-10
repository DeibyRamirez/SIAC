# Sincronización ClickUp — SIAC

> Guía para alinear el repositorio Git con la gestión Scrum en ClickUp.
>
> **El estado oficial vive en ClickUp; este repositorio no declara sprints completados.**

La lista de la guía anterior («Hito 4 · Desarrollo · 3 sprints (F-04)») no existía en el workspace de SIAC. La jerarquía real se verificó en ClickUp el 06/10/2026 (solo lectura) y se sincronizó con el repo el 08/10/2026.

## Workspace ClickUp (SIAC)

| Recurso | ID / Nombre |
|---------|-------------|
| Workspace | `90171502668` |
| Space | **Sprints** — `90177117506` |
| Lista **List** (backlog global) | `901716407598` ([abrir](https://app.clickup.com/90171502668/v/l/li/901716407598)) |
| Lista Sprint 1 | **Sprint 1·Fundación** — `901717352934` ([abrir](https://app.clickup.com/90171502668/v/l/li/901717352934)) |
| Lista Sprint 2 | **Sprint 2·Núcleo documental** — `901717352937` ([abrir](https://app.clickup.com/90171502668/v/l/li/901717352937)) |
| Lista Sprint 3 | **Sprint 3·Calidad e integración** — `901717352938` ([abrir](https://app.clickup.com/90171502668/v/l/li/901717352938)) |
| Lista Sprint 4 | **Sprint 4·Cierre** — `901717352939` ([abrir](https://app.clickup.com/90171502668/v/l/li/901717352939)) |
| Estados de la lista | `to do` → `in progress` → `complete` |

Cada sprint tiene su propia lista en el space **Sprints**; las historias (HU) y sus subtareas (T-xxx.y) viven en la lista del sprint correspondiente.

### Jerarquía y vista Lista (formato Sprint 3)

En cada lista de sprint, la vista **Lista** agrupada por **Estado** muestra solo las **HUs padre** al nivel superior (`HU-XXX · Descripción`). Las tareas técnicas (`T-xxx.y`) son **subtareas** anidadas (`parent` = id de la HU en la API).

| Lista | HUs raíz (nivel lista) | Subtareas |
|-------|------------------------|-----------|
| Sprint 1 | HU-001, HU-002, HU-011, HU-003 (inicio) | T-002.1, T-011.1–3, T-003.0 |
| Sprint 2 | HU-003, HU-004, HU-005, HU-008, HU-010 | T-003.x, T-004.1, T-005.x, T-008.x, T-010.x, T-REF-001, T-DOC.1, T-007.5 |
| Sprint 3 | HU-006, HU-007, HU-009 | T-006.x, T-007.x, T-009.x |

La lista **List** (`901716407598`) es el backlog global (INF-01..08, TECH-01, entregables de inception); **no** sustituye las listas de sprint.

**Sprints 1 y 2 cerrados:** todas las tareas están en estado `complete`. En la UI, el grupo **PENDIENTE** muestra 0; expande el grupo **COMPLETADO** (o activa «Mostrar cerradas») para ver las HUs con su contador de subtareas.

## Estructura de Epics (1 por sprint)

| Epic | Sprint | Periodo | Tag Git |
|------|--------|---------|---------|
| Epic 0 — Inception | Etapa 0 | 20/08 – 02/09/2026 | `v0.0.0-inception` |
| Epic 1 — Fundación técnica | Sprint 1 | 03/09 – 23/09/2026 | `v0.1.0-sprint-1` |
| Epic 2 — Núcleo documental | Sprint 2 | 24/09 – 07/10/2026 | `v0.2.0-sprint-2` |
| Epic 3 — Calidad e integración | Sprint 3 | 08/10 – 18/11/2026 | `v0.3.0-sprint-3` |
| Epic 4 — Cierre y entrega | Sprint 4 | 10/11 – 20/11/2026 | `v1.0.0-release` |

## Tareas por Historia de Usuario

### Epic 1 — Sprint 1

| Tarea ClickUp | HU | Commits Git (referencia) |
|---------------|-----|--------------------------|
| Login JWT backend + frontend | HU-001 | `feat(sprint-1): HU-001 login JWT` |
| Redirección por rol | HU-002 | `feat(sprint-1): HU-002 pantalla inicio por rol` |
| Guards y roles | HU-011 | `feat(sprint-1): HU-011 roles y permisos` |
| Carga evidencia inicial | HU-003 | `feat(sprint-1): HU-003 inicio carga evidencias` |

### Epic 2 — Sprint 2

| Tarea ClickUp | HU | Commits Git |
|---------------|-----|-------------|
| Plantillas versionadas | HU-005 | `feat(sprint-2): HU-005 biblioteca plantillas` |
| Búsqueda facetada | HU-008 | `feat(sprint-2): HU-008 busqueda facetada` |
| CRUD evidencias + programas | HU-004, HU-010 | `feat(sprint-2): HU-004 CRUD evidencias` |

### Epic 3 — Sprint 3

| Tarea ClickUp | HU | Commits Git |
|---------------|-----|-------------|
| Flujo aprobación | HU-006 | `feat(sprint-3): HU-006 aprobacion` |
| Vigencias y cron | HU-007 | `feat(sprint-3): HU-007 vigencias cron` |
| Power BI embed | HU-009 | `feat(sprint-3): HU-009 Power BI` |

### Epic 4 — Sprint 4

| Tarea ClickUp | Entregable | Commits Git |
|---------------|------------|-------------|
| CI/CD GitHub Actions | `.github/workflows/ci.yml` | `chore(sprint-4): CI/CD` |
| Manuales | `docs/manuales/` | `chore(sprint-4): manuales` |
| Release v1.0.0 | Tag final | `v1.0.0-release` |

## Estrategia de ramas Git (oficial)

```text
main          ← solo código estable
  └ develop_v2 ← integración actual (Sprint 2)
      └ feature/HU-XXX
```

- Una rama por historia de usuario hacia `develop_v2`.
- PR hacia `develop_v2` revisado por el otro integrante. El merge histórico `develop` → `main` sigue siendo el cierre de entrega.
- Commits con **Conventional Commits** referenciando la HU.

## Convención de enlaces en ClickUp

En la descripción de cada tarea, incluir:

```markdown
## Repositorio
- Repo: https://github.com/DeibyRamirez/SIAC
- Rama: develop_v2 / feature/HU-XXX
- Commit: [hash corto]
- Tag: v0.N.0-sprint-N

## Definition of Done
- [ ] Criterio de aceptación F-02
- [ ] Sprint review documentada en docs/sprint-reviews/
```

## Flujo de cierre de sprint

1. Completar todas las tareas HU del epic en ClickUp
2. Merge de la rama de integración (`develop_v2`) hacia `main` (vía PR aprobado)
3. Crear tag `v0.N.0-sprint-N`
4. Publicar [sprint review](sprint-reviews/) en repo
5. Mover epic a **Done** en ClickUp
6. Sprint Planning del siguiente epic

## Commits del repositorio SIAC

Ver historial completo:

```bash
cd D:\Proyectos\SIAC
git log --oneline --decorate --all
git tag -l
```

## Ramas activas

| Rama | Estado |
|------|--------|
| `main` | Estable |
| `develop_v2` | Integración actual. Sprint 2 cerrado en ClickUp (08/10/2026); Sprint 3 en curso |
| `feature/HU-*` | Historias en progreso hacia `develop_v2` |
