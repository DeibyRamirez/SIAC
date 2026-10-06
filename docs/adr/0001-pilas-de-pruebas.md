# ADR 0001 — Pilas de pruebas: Jest + supertest en el backend y Vitest + Testing Library en el frontend

- **Estado:** Aceptada
- **Fecha:** 06/10/2026
- **Decisión del PO:** 06/10/2026 (cierre del Sprint 2, pregunta 1 de la auditoría)
- **Historias y tareas:** HU-010 · T-010.4 (E2E) y T-010.5 (infraestructura de pruebas)

## Contexto

El criterio original de T-010.5 pedía Jest en todo el proyecto. En el Sprint 2 el frontend (Next.js 16, React 19, ESM) quedó con Vitest + React Testing Library + jsdom, y el backend (NestJS 10, CommonJS) ya usaba Jest con ts-jest. Faltaban supertest, el `test:e2e` y el doble de Storage. La auditoría del 06/10 preguntó si se aceptaba Vitest en el frontend y si se registraba como ADR.

## Decisión

Se mantienen las dos pilas:

| Capa | Herramientas | Comando | Dónde corre |
|------|--------------|---------|-------------|
| Backend unitarias | Jest + ts-jest | `pnpm exec jest` (o `pnpm test`) | CI *Backend CI* |
| Backend E2E | Jest + supertest, API completa con PostgreSQL local o de CI y Storage en memoria (`test/utilidades/almacenamiento-memoria.ts`) | `pnpm test:e2e` (`test/jest-e2e.json`, `--runInBand`) | CI *Backend CI*, tras `migrate deploy` + semilla sobre `postgres:16` |
| Frontend | Vitest + React Testing Library + jsdom (Node 22) | `pnpm test` (`vitest run`) | CI *Frontend CI* |

Las E2E solo pueden correr contra una BD local o de CI (`verificarBaseDeDatosDesechable`); para otro host hay que declararlo con `SIAC_E2E_PERMITIR_BD_REMOTA=true`.

## Motivos

- Vitest entiende ESM, TypeScript y los alias de Next sin transformar con Babel; con Jest el frontend necesitaría una configuración paralela (next/jest, SWC) solo para pruebas.
- La API de Vitest es compatible con Jest (`describe`, `it`, `expect`, `vi` ≈ `jest`) y RTL es la misma, así que las pruebas se leen igual en ambos lados.
- NestJS trae Jest por defecto (`@nestjs/testing`, ts-jest, decoradores y metadatos), y supertest es el estándar para E2E HTTP con Nest.
- Migrar cualquiera de las dos capas no aporta valor al Sprint 2 y pondría en riesgo la CI.

## Consecuencias

- El criterio de aceptación de T-010.5 queda: «Backend con Jest + supertest (`test:e2e`) y frontend con Vitest + RTL; ambas suites corren en la CI en cada push y PR a `develop_v2`».
- Quien escriba pruebas usa `jest.fn()` en el backend y `vi.fn()` en el frontend; no se mezclan.
- Las dos suites deben quedar en verde antes de cada push (regla del repositorio).
- No hay pruebas de navegador (Playwright o Cypress) en este alcance; si se necesitan, irán en un ADR nuevo.
