# Sincronización ClickUp — SIAC

> Guía para alinear el repositorio Git con la gestión Scrum en ClickUp.

## Workspace ClickUp (CUAC)

| Recurso | ID / Nombre |
|---------|-------------|
| Space | `Universidad` |
| Folder | `Tareas` |
| Lista recomendada | **Hito 4 · Desarrollo · 3 sprints (F-04)** — `901716974523` |

Crear los 4 Epics de sprint en esa lista usando las plantillas de abajo.

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
  └ develop   ← integración de incrementos
      ├ feature/HU-001-login-jwt
      ├ feature/HU-003-carga-evidencias
      └ feature/HU-011-roles-permisos
```

- Una rama por historia de usuario hacia `develop`.
- PR de `develop` → `main` revisado por el otro integrante.
- Commits con **Conventional Commits** referenciando la HU.

## Convención de enlaces en ClickUp

En la descripción de cada tarea, incluir:

```markdown
## Repositorio
- Repo: https://github.com/DeibyRamirez/SIAC_Backend
- Rama: develop (Sprint 1) / feature/HU-XXX
- Commit: [hash corto]
- Tag: v0.N.0-sprint-N

## Definition of Done
- [ ] Criterio de aceptación F-02
- [ ] Sprint review documentada en docs/sprint-reviews/
```

## Flujo de cierre de sprint

1. Completar todas las tareas HU del epic en ClickUp
2. Merge rama `develop` → `main` (vía PR aprobado)
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
| `main` | Estable — requiere PR desde `develop` |
| `develop` | Integración Sprint 1 (HU-001, HU-002, HU-003, HU-011) |
| `feature/HU-*` | Historias en curso hacia `develop` |
