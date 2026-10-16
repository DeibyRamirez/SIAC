# Sprint Review — Sprint 3: Calidad e integración

**Periodo:** 08/10 – 18/11/2026  
**Estado:** Cierre de implementación en repositorio (S3-CIERRE, 16/10/2026); revisión y aceptación pendientes.

> El estado oficial vive en ClickUp; este repositorio no declara sprints completados.

## Historias

| HU | Estado en repositorio | Evidencia |
|----|-----------------------|-----------|
| HU-006 | Implementada (S3-HU006, 16/10/2026). Pendiente validación PO/CI | Máquina de estados en `dominio/maquina-estados-evidencia.ts`, observación obligatoria por condición, notificación al Cargador con correo escapado, `dictamen-sin-puntaje.e2e-spec.ts` (G2/G4) |
| HU-007 | Implementada (S3-CIERRE, 16/10/2026). Pendiente validación PO/CI | Umbrales 24/18 + `Vencido` en `ConfiguracionSIAC` y editables vía `GET/PATCH /api/v1/configuracion/vigencia`; outbox `NotificacionSalida` con procesador de reintentos y bitácora `GET /notificaciones/salida`; cron 6:00 America/Bogota; E2E `umbrales-vigencia.e2e-spec.ts` y `alertas-vigencia.e2e-spec.ts` (los corre CI); campana con polling 5 s y test propio |
| HU-009 | Dashboards Power BI «Publicar en la web» configurados (panel admin, 8 categorías); modo embebido App Owns Data bloqueado sin credenciales Azure (ADR-009/010). Pendiente validación PO | `powerbi.controller.ts`, `ConfiguracionInformePowerBi`, panel `/administrador/dashboard`, E2E/modelos de cifras de S3-01..03 |

## Cierre técnico S3-CIERRE (16/10/2026)

- Prisma es la única capa de datos: se eliminó el SQL crudo de `EvidenciaComentario` en
  `evidencia.repositorio.ts` (ahora `createMany`/`findMany` tipados en `$transaction`) y se retiró
  `prisma/aplicar-esquema-versionado.ts` (`pnpm prisma:repair-schema`), que alteraba el esquema
  fuera de migraciones. `prisma/verificar-esquema.ts` se mantiene como verificación de solo lectura.
- La migración `20261016120000_t007_3_umbrales_outbox` quedó aplicada.
- Verificación local: Backend Jest 48 suites / 413 tests, `tsc` y `pnpm build` OK; Frontend
  Vitest 29 archivos / 129 tests, `tsc` y `next build` OK. E2E (`test:e2e`) se ejecutan en CI.

## Casos de prueba CP-01..CP-04

Documentados en [docs/etapa-3/README.md](../etapa-3/README.md). Aún no se dan por aceptados.
