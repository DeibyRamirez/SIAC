# Camino 2 — API de cifras institucionales (guía para integradores)

> **Estado:** contrato y flujo definidos en [ADR-010](adr/ADR-010-camino-2-api-cifras-institucionales.md).  
> **Los endpoints descritos aquí aún no están implementados** tras la retirada del módulo `/api/v1/cifras` (octubre 2026).

## Qué usa SIAC hoy (Camino 1)

1. Excel maestro (p. ej. en Google Drive o servidor institucional) con una hoja por categoría.
2. Power BI Desktop/Service conectado a ese Excel y refresco programado.
3. SIAC muestra el informe con la URL pública guardada en `ConfiguracionInformePowerBi` (panel de administración → dashboard de métricas).

No hace falta llamar al SIAC para **consultar** cifras: Power BI lee el Excel directamente.

## Qué se planea (Camino 2)

Proyectos externos (SIGA, investigación, etc.) enviarán **lotes JSON** al SIAC. El backend:

1. Valida cada registro contra el esquema de la categoría.
2. Actualiza el **mismo Excel maestro** que ya alimenta Power BI (opción B1 del ADR-010).
3. Devuelve resumen `{ filasOk, filasError, errores[] }`.

Así se evita mantener una copia en Postgres y una en Excel.

## Catálogo de categorías

| `categoriaId` | Hoja en plantilla | Formato del cuerpo `registros` |
|---------------|-------------------|--------------------------------|
| `estudiantes` | `estudiantes` | Objetos con claves snake_case de la hoja |
| `profesores` | `profesores` | Igual |
| `egresados` | `egresados` | Igual |
| `investigacion` | `investigacion` | Igual |
| `aseguramiento` | `aseguramiento` | Igual |
| `infraestructura` | `infraestructura` | Igual (reemplazo por `sede`) |
| `bienestar` | `bienestar` | Clave/valor: `clave`, `periodo`, `facultad`, `dimension`, `valor_dimension`, `valor` |
| `relaciones-entorno` | `relaciones-entorno` | Igual que bienestar |

Fuente de verdad de columnas: **[`plantillas-siac-general.xlsx`](plantillas-siac-general.xlsx)** (encabezados, tipos, obligatoriedad, valores permitidos).

## Reglas comunes

- **Periodo:** `2026-1`, `2026-2` o `2026` según categoría.
- **Reemplazo de lote:** al aceptar un envío para un periodo (o sede en infraestructura), se sustituyen las filas previas de ese ámbito en el archivo maestro, no se hace append ciego.
- **Errores:** respuesta HTTP 400 con lista `{ fila, columna?, mensaje }` en español.
- **Autenticación (prevista):** header `x-api-key` por integrador; clave gestionada por administración TI/SIAC (distinta por proyecto).
- **Privacidad:** no publicar en APIs de lectura campos personales definidos en la plantilla; el Excel maestro sigue las políticas institucionales de acceso.

## Ejemplo de envío (estudiantes) — ilustrativo

```http
POST /api/v1/integracion/cifras-institucionales/estudiantes/envios
Content-Type: application/json
x-api-key: <clave-del-proyecto>

{
  "registros": [
    {
      "programa": "Ingeniería Agropecuaria",
      "genero": "Femenino",
      "facultad": "Facultad de Ciencias Agrarias",
      "semestre": 5,
      "estrato": 2,
      "codigo_estudiante": "2020002350129",
      "periodo_academico": "2026-1"
    }
  ]
}
```

El campo `nombre_estudiante` es opcional y personal; puede omitirse en integraciones que no lo tengan autorizado.

## Ejemplo clave/valor (bienestar) — ilustrativo

```json
{
  "periodo": "2026-1",
  "registros": [
    {
      "clave": "participantes_programa_x",
      "facultad": "Facultad de Ingeniería",
      "dimension": "vinculacion",
      "valor_dimension": "convenio",
      "valor": 120
    }
  ]
}
```

## Próximos pasos de implementación

1. Confirmar con TI: ruta del Excel maestro, permisos de escritura (Drive API / Graph / SFTP).
2. Implementar módulo NestJS `integracion-cifras-institucionales` según ADR-010.
3. Publicar OpenAPI en `/api/docs` y entregar clave API al proyecto piloto.
4. Validar refresco Power BI sin cambiar URL en SIAC.

## Historial

- **S3-03 (retirado):** `POST /api/v1/cifras/:id/ingesta` + Postgres + `GET .../datos` para Power BI Web. Ver [`powerbi-conexion-cifras.md`](powerbi-conexion-cifras.md) (obsoleto).
