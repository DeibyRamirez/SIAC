# ADR-010 — Camino 2: API de cifras institucionales

**Estado:** Aceptada (implementada)  
**Fecha:** 2026-10-13; decisión de almacén revisada el 2026-11-03  
**Relacionado:** HU-009, [ADR-009](ADR-009-powerbi-publicar-web.md), retirada del almacén Postgres de cifras (2026-10-13)

## Contexto

- **Camino 1 (producción):** Excel maestro en Drive/servidor → refresco en Power BI Service → SIAC embebe la URL pública (`ConfiguracionInformePowerBi`) y el administrador actualiza el enlace solo si cambia el informe publicado.
- **Camino 2 (deseo):** proyectos externos envían datos con un contrato estable (8 categorías de información estructural) para alimentar los mismos informes Power BI con poca intervención manual.
- Entre octubre 2025 y octubre 2026 el repo implementó un hub en Postgres (`Registro*`, `CifraIndicador`, feed `GET /cifras/.../datos`). Ese diseño **duplicaba** el Excel de Camino 1 y alimentaba gráficos nativos en SIAC. Fue **retirado** a favor de Camino 1; el contrato de columnas se conserva en [`plantillas-siac-general.xlsx`](../plantillas-siac-general.xlsx) y en el historial de git (`Backend/src/cifras/esquemas/*` antes de la eliminación).

## Decisión de arquitectura

### El dueño del proyecto reemplaza B1 por almacenamiento en Postgres

La propuesta del 2026-10-13 prefería **B1**: la API validaba y escribía el Excel maestro. Esa opción queda **reemplazada**. Camino 2 persiste las cifras en Postgres. El archivo [`plantillas-siac-general.xlsx`](../plantillas-siac-general.xlsx) queda solo como fuente de validación (columnas, tipos, obligatoriedad y valores permitidos). No es el almacén.

Se elige Postgres, y no el Excel, por tres motivos:

1. **Concurrencia.** Dos integradores no pueden escribir a la vez un libro de Excel sin bloquearse o pisarse. Postgres aísla las escrituras por ámbito (periodo o sede).
2. **Transacciones.** Un lote inválido no debe dejar el almacén a medias. El reemplazo del ámbito ocurre en una sola transacción: o entran todas las filas válidas, o no se escribe ninguna.
3. **El GET.** La lectura paginada y filtrada (`GET .../:categoria`) necesita consultar por periodo o sede. Un archivo no ofrece esa consulta sin volver a parsearlo en cada petición. Postgres sí, y Power BI lee vistas de solo lectura en lugar de esperar un refresco del libro.

Camino 1 (URL pública de un informe ya publicado) no cambia. Las vistas nuevas alimentan el dataset cuando TI conecte Power BI a `siac_powerbi_lectura`.

### Opciones que no se usan

| Id | Descripción | Motivo |
|----|-------------|--------|
| B1 | API valida y actualiza el Excel maestro | Reemplazada por esta decisión: concurrencia, transacciones y el GET |
| B2 | API → data lake / otro servicio | Requiere infra fuera del alcance del equipo SIAC |

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
| `bienestar` | Bienestar | Una fila por programa, servicio y periodo | `periodo_academico` |
| `relaciones-entorno` | Relaciones con el entorno | Una fila por aliado, ámbito y periodo | `periodo_academico` |

- **Columnas, tipos, obligatoriedad y enums:** hoja homónima en [`docs/plantillas-siac-general.xlsx`](../plantillas-siac-general.xlsx) (fuente normativa para integradores).
- **Periodo académico:** `AAAA` o `AAAA-S` con `S ∈ {1,2}` (misma regla que el módulo retirado).
- **Datos personales:** columnas marcadas como personales en la plantilla (p. ej. nombre de estudiante) pueden existir en el archivo maestro según política institucional, pero **no** deben exponerse en APIs públicas de lectura ni en feeds anonimizados.
- **Referencia técnica histórica:** esquemas tipados en commit previo a `20261013230000_eliminar_cifras_institucionales` (`Backend/src/cifras/esquemas/`).

Guía operativa para integradores: [`docs/camino-2-api-cifras-institucionales.md`](../camino-2-api-cifras-institucionales.md).

## API implementada

Prefijo: `/api/v1/integracion`.

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| `POST` | `/cifras-institucionales/:categoria/envios` | `x-api-key` | Cuerpo `{ periodo?, registros }`. Si hay errores, 400 y no escribe. Si es válido, reemplaza el ámbito en una transacción. |
| `GET` | `/cifras-institucionales/:categoria` | `x-api-key` | Lectura paginada. Omite columnas personales. |
| `POST` | `/claves` | JWT SuperAdmin | Crea un integrador y devuelve la clave en claro una sola vez. |
| `GET` | `/claves` | JWT SuperAdmin | Lista integradores sin hash. |
| `POST` | `/claves/:id/revocar` | JWT SuperAdmin | Revoca la clave. |

La clave se guarda como SHA-256. La comparación usa `crypto.timingSafeEqual`. No se reutiliza un `CIFRAS_API_KEY` global. Límite de tasa: 30 POST y 120 GET por minuto y por clave.

Power BI no llama al GET. Lee las vistas `v_powerbi_*` con `GRANT SELECT` solo para `siac_powerbi_lectura`. Esas vistas no incluyen nombre ni código de persona.

`bienestar` y `relaciones-entorno` no tienen hoja en el xlsx. `bienestar` usa `periodo_academico`, `facultad`, `programa`, `genero`, `linea_bienestar`, `servicio`, `beneficiarios` y `valor_invertido_cop`. `relaciones-entorno` usa `periodo_academico`, `facultad`, `programa`, `tipo_relacion`, `aliado`, `sector_aliado`, `ambito`, `fecha_inicio`, `fecha_fin` y `estudiantes_participantes`.

## Consecuencias

- Camino 1 (URL pública del informe) sigue igual.
- Hay que aplicar las migraciones `20261103160000_camino_2_cifras_institucionales` y `20261105130000_cifras_bienestar_relacion_entorno` antes de usar la API.
- El Excel maestro deja de ser el destino de la ingesta. Sigue sirviendo para contrastar columnas y valores permitidos.
- Las columnas personales se pueden recibir y guardar (la plantilla las trae) y no salen por el GET ni por las vistas.

## Criterios de aceptación

1. Un lote válido de `estudiantes` reemplaza el periodo en Postgres dentro de una transacción.
2. Un lote inválido responde errores por fila y columna en español y no escribe.
3. El GET y `v_powerbi_estudiantes` no exponen `nombre_estudiante` ni `codigo_estudiante`.
4. OpenAPI y `docs/camino-2-api-cifras-institucionales.md` coinciden con el comportamiento.
