# ADR-010 — Camino 2: API de cifras institucionales (futuro)

**Estado:** Propuesta (contrato y arquitectura; **sin implementación** en el sprint actual)  
**Fecha:** 2026-10-13  
**Relacionado:** HU-009, [ADR-009](ADR-009-powerbi-publicar-web.md), retirada del almacén Postgres de cifras (2026-10-13)

## Contexto

- **Camino 1 (producción):** Excel maestro en Drive/servidor → refresco en Power BI Service → SIAC embebe la URL pública (`ConfiguracionInformePowerBi`) y el administrador actualiza el enlace solo si cambia el informe publicado.
- **Camino 2 (deseo):** proyectos externos envían datos con un contrato estable (8 categorías de información estructural) para alimentar los mismos informes Power BI con poca intervención manual.
- Entre octubre 2025 y octubre 2026 el repo implementó un hub en Postgres (`Registro*`, `CifraIndicador`, feed `GET /cifras/.../datos`). Ese diseño **duplicaba** el Excel de Camino 1 y alimentaba gráficos nativos en SIAC. Fue **retirado** a favor de Camino 1; el contrato de columnas se conserva en [`plantillas-siac-general.xlsx`](../plantillas-siac-general.xlsx) y en el historial de git (`Backend/src/cifras/esquemas/*` antes de la eliminación).

## Decisión de arquitectura (replanteo)

### Fuente de verdad de los informes Power BI

Sigue siendo el **dataset que refresca Power BI** (hoy: archivo maestro en Drive). SIAC no vuelve a ser réplica relacional de filas por estudiante/egresado salvo que en el futuro se elija explícitamente la opción B3.

### Opción preferida para Camino 2: **B1 — API valida y actualiza el Excel maestro**

| Paso | Responsable |
|------|-------------|
| 1 | Proyecto externo llama API SIAC con lote de registros validados |
| 2 | SIAC valida contra el esquema de la categoría (mismas columnas que la plantilla) |
| 3 | SIAC escribe/merge en el **archivo maestro** (Drive/SharePoint) o delega en un conector aprobado por TI |
| 4 | Power BI Service refresca desde ese archivo (sin cambiar URLs en SIAC) |

**Ventajas:** un solo almacén visible para Oscar/TI; no duplicar Postgres + Excel; las URL de embed siguen estables.

### Opciones descartadas por ahora (referencia)

| Id | Descripción | Motivo de no elegir ahora |
|----|-------------|---------------------------|
| B2 | API → data lake / otro servicio; PBI conecta allí | Requiere infra y gobierno de datos fuera del alcance del equipo SIAC |
| B3 | Volver a hub en Postgres | Reintroduce redundancia con Camino 1 y coste operativo que el equipo rechazó |

La opción B1 puede revisarse si TI no permite escritura automatizada al Excel maestro; en ese caso convocar nueva ADR antes de implementar.

## Contrato de datos (8 categorías)

Los `categoriaId` coinciden con el catálogo de informes Power BI en el frontend (`lib/informes-powerbi.ts`).

| categoriaId | Título | Modelo de carga | Clave de reemplazo de lote |
|-------------|--------|-----------------|----------------------------|
| `estudiantes` | Estudiantes | Una fila por estudiante y periodo | `periodo_academico` |
| `profesores` | Profesores | Una fila por docente y periodo | `periodo_academico` |
| `egresados` | Egresados | Una fila por egresado | `graduados_periodo` |
| `investigacion` | Investigación | Filas por semillero/grupo/programa | `periodo_academico` |
| `aseguramiento` | Aseguramiento | Filas por programa/SNIES y periodo | `periodo_academico` |
| `infraestructura` | Infraestructura | Una fila por sede | `sede` (sin periodo) |
| `bienestar` | Bienestar | Clave / valor por variable y periodo | `periodo` |
| `relaciones-entorno` | Relaciones con el entorno | Clave / valor por variable y periodo | `periodo` |

- **Columnas, tipos, obligatoriedad y enums:** hoja homónima en [`docs/plantillas-siac-general.xlsx`](../plantillas-siac-general.xlsx) (fuente normativa para integradores).
- **Periodo académico:** `AAAA` o `AAAA-S` con `S ∈ {1,2}` (misma regla que el módulo retirado).
- **Datos personales:** columnas marcadas como personales en la plantilla (p. ej. nombre de estudiante) pueden existir en el archivo maestro según política institucional, pero **no** deben exponerse en APIs públicas de lectura ni en feeds anonimizados.
- **Referencia técnica histórica:** esquemas tipados en commit previo a `20261013230000_eliminar_cifras_institucionales` (`Backend/src/cifras/esquemas/`).

Guía operativa para integradores: [`docs/camino-2-api-cifras-institucionales.md`](../camino-2-api-cifras-institucionales.md).

## API futura (borrador, no implementada)

Prefijo propuesto: `/api/v1/integracion/cifras-institucionales`.

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/:categoriaId/esquema` | JSON con columnas (equivalente a plantilla.json histórico) |
| `POST` | `/:categoriaId/envios` | Cuerpo `{ periodo?, registros: [...] }`; validación; respuesta con filas OK/error |
| — | Autenticación | `x-api-key` por integrador + registro de auditoría (sin reutilizar el antiguo `CIFRAS_API_KEY` sin rotación) |

No se implementa `GET .../datos` en Postgres: la lectura para Power BI sigue siendo el **archivo maestro** o el conector que defina TI.

## Consecuencias

- Camino 1 no cambia: migración aplicada, sin tablas `Registro*` / `CifraIndicador`.
- Camino 2 requiere un sprint dedicado: conector Drive/SharePoint o cola de archivos, pruebas con un proyecto piloto, y OpenAPI versionado publicado en `/api/docs`.
- Hasta entonces, los externos deben coordinar carga manual del Excel maestro con el responsable de datos (Oscar/TI).

## Criterios de aceptación del sprint de implementación (futuro)

1. Un integrador piloto envía lote válido de `estudiantes` y el Excel maestro refleja los datos sin intervención manual.
2. Power BI refresca y el informe en SIAC (misma URL) muestra datos nuevos.
3. Lote inválido devuelve errores por fila/columna en español, sin escribir archivo.
4. Documentación OpenAPI y ejemplo en `docs/camino-2-api-cifras-institucionales.md` alineados con la plantilla xlsx.
