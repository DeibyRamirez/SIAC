# ADR-010 — Camino 2: API de cifras institucionales

**Estado:** Aceptada  
**Fecha:** 2026-10-13  
**Enmienda:** 2026-11-03 — se implementa la opción B3 (hub en Postgres) como Camino 2; Camino 1 (Excel) se conserva.  
**Relacionado:** HU-009, [ADR-009](ADR-009-powerbi-publicar-web.md)

## Contexto

- **Camino 1 (producción, sin cambios):** Excel maestro → refresco en Power BI Service → SIAC embebe la URL pública (`ConfiguracionInformePowerBi`).
- **Camino 2:** sistemas externos (FEAT, SIGA, investigación) envían lotes JSON. SIAC valida y reemplaza filas en PostgreSQL. Power BI lee vistas de solo lectura con `siac_powerbi_lectura`.
- Entre octubre 2025 y octubre 2026 existió un hub (`Registro*`, `CifraIndicador`) que se retiró. Esta ADR lo reintroduce con otro nombre (`Cifra*`), claves por integrador y vistas sin PII.

## Decisión

### Camino 1 sigue siendo Excel

No se escribe el archivo maestro desde la API. Quien alimente Power BI por Excel no depende de Camino 2.

### Camino 2 es B3: API valida y escribe Postgres

| Paso | Responsable |
|------|-------------|
| 1 | El Administrador crea una clave (`x-api-key`) por sistema |
| 2 | El integrador llama `POST /api/v1/integracion/cifras-institucionales/{categoriaId}/envios` |
| 3 | SIAC valida el lote; si hay error no escribe; si es válido reemplaza el periodo (o la sede) |
| 4 | Power BI refresca desde `v_powerbi_cifras_*` (conector PostgreSQL) |

La Data API / PostgREST de Supabase permanece cerrada (`anon`/`authenticated` revocados). El mismo Prisma + SQL corre en Supabase y en el PostgreSQL institucional.

### Opciones no elegidas

| Id | Descripción | Motivo |
|----|-------------|--------|
| B1 | API escribe el Excel maestro | Requiere conector Drive/Graph que TI no cerró; no bloquea a FEAT |
| B2 | Data lake aparte | Fuera de alcance |

## Contrato de datos (8 categorías)

Los `categoriaId` coinciden con el catálogo de informes Power BI.

| categoriaId | Tabla | Clave de reemplazo |
|-------------|-------|--------------------|
| `estudiantes` | `CifraEstudiante` | `periodo_academico` |
| `profesores` | `CifraProfesor` | `periodo_academico` |
| `egresados` | `CifraEgresado` | `graduados_periodo` |
| `investigacion` | `CifraInvestigacion` | `periodo_academico` |
| `aseguramiento` | `CifraAseguramiento` | `periodo_academico` |
| `infraestructura` | `CifraInfraestructura` | `sede` |
| `bienestar` | `CifraBienestar` | `periodo` |
| `relaciones-entorno` | `CifraRelacionEntorno` | `periodo` |

Nombres personales se persisten si el integrador los manda; no salen en las vistas ni en `GET .../datos`.

## API

Prefijo: `/api/v1/integracion/cifras-institucionales`.

| Método | Ruta | Auth |
|--------|------|------|
| POST/GET/PATCH/DELETE | `/claves` | JWT Administrador |
| GET | `/:categoriaId/esquema` | JWT Admin o `x-api-key` |
| GET | `/:categoriaId/datos` | JWT Admin o `x-api-key` |
| POST | `/:categoriaId/envios` | `x-api-key` |

Guía: [`docs/camino-2-api-cifras-institucionales.md`](../camino-2-api-cifras-institucionales.md).

## Consecuencias

- Camino 1 intacto.
- 10 tablas nuevas con RLS ENABLE+FORCE. Power BI no ve `ClaveIntegracion` ni columnas de nombre.
- Hay que aplicar la migración en Supabase (Render `migrate deploy`) y en el Postgres de producción.
