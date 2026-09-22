# AGENTS.md — SIAC (entrega)

Instrucciones para agentes de IA que trabajen en este repositorio.

## Leer primero

1. `MemoriaGlobal.md` — fuente de verdad transversal (estado, ADRs, convenciones).
2. `.cursor/memory.jsonl` — memoria MCP compartida en Git (entidades/relaciones para `@modelcontextprotocol/server-memory`).
3. `docs/etapa-1/README.md` — alcance del Sprint 1 (HU-001, HU-002, HU-011, inicio HU-003).
4. `Frontend/MEMORIA_PROYECTO.md` — memoria específica del frontend.
5. Skills del proyecto en `.agents/skills/` y `Skills/`.

### Memoria MCP en el repo

- `.cursor/mcp.json` incluye el servidor **memory** con `MEMORY_FILE_PATH=.cursor/memory.jsonl` (ruta relativa al proyecto, válida para todo el equipo).
- Tras cambios de arquitectura o sprint, actualizar `.cursor/memory.jsonl` además de `MemoriaGlobal.md`.

## Skills locales del proyecto

| Skill | Cuándo usarla |
|-------|----------------|
| `.agents/skills/siac-diseno-web-responsive` | UI, layout, tokens CUAC, responsive |
| `.agents/skills/siac-documentacion-arquitectura` | docs/etapa-N, decisiones, cierre de sprint |
| `.agents/skills/siac-nextjs-nestjs-crud` | APIs NestJS, páginas Next, DTOs, JWT/roles |
| `.agents/skills/siac-powerbi-datos` | HU-009, Excel, dashboards |
| `Skills/FrontendDesing.md` | Diseño frontend / look & feel |

## Estructura relevante

- `Backend/` — NestJS + Prisma + Supabase
- `Frontend/` — Next.js App Router en `Frontend/` (`app/`, `components/`, `lib/`)
- `docs/` — etapas, backlog, sprint reviews
- `Documentos/` — F-00..F-03 y material normativo
- `.github/workflows/` — CI/CD (cuando esté presente)

## Reglas rápidas

- No commitear `.env`, `.env.local` ni secretos.
- Usar `pnpm` (no npm).
- API versionada en `/api/v1` con Swagger en `/api/docs`.
- Roles: Cargador, Revisor, Administrador, Par Académico (RN-001).
- Antes de ampliar alcance, contrastar con la etapa/sprint documentada.

## Actualizar memoria

Tras una sesión significativa: actualizar **Estado actual**, **Tareas** y **Registro de cambios** en `MemoriaGlobal.md` y, si aplica, en `Frontend/MEMORIA_PROYECTO.md`.

## Skills externas instaladas (skills.sh)

| Skill | Uso sugerido |
|-------|----------------|
| `supabase` / `supabase-postgres-best-practices` | Auth, Storage, RLS, SQL, migraciones Postgres |
| `prisma-cli` / `prisma-client-api` / `prisma-database-setup` | Prisma generate/migrate/queries |
| `vercel-react-best-practices` / `web-design-guidelines` | Rendimiento Next/React y UI |
| `code-review` / `diagnosing-bugs` / `resolving-merge-conflicts` | Revisión, bugs, merges |
| `systematic-debugging` / `verification-before-completion` | Depuración y cierre de tareas |
| `frontend-design` | Diseño UI general |
| `find-skills` | Descubrir más skills |

También existe `skills-lock.json` en la raíz del repo.
