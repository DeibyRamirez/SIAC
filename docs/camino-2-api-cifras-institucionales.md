# Camino 2 — API de cifras institucionales

> **Estado:** implementado. Decisión en [ADR-010](adr/ADR-010-camino-2-api-cifras-institucionales.md).  
> Las cifras se guardan en Postgres. El Excel [`plantillas-siac-general.xlsx`](plantillas-siac-general.xlsx) solo valida columnas, tipos, obligatoriedad y valores permitidos. La hoja `LEEME` es informativa y `LM` no pertenece a SIAC.

## Qué sigue usando SIAC (Camino 1)

1. El administrador guarda la URL pública del informe en `ConfiguracionInformePowerBi`.
2. SIAC embebe esa URL. No hace falta llamar a esta API para ver el informe.

Cuando TI conecte el dataset, Power BI lee las vistas `v_powerbi_*` con el rol `siac_powerbi_lectura` (`GRANT SELECT` solo sobre esas vistas y las columnas que usan, sin datos personales).

## Categorías

| `categoria` | Hoja en la plantilla | Ámbito que reemplaza el lote |
|-------------|----------------------|------------------------------|
| `estudiantes` | `estudiantes` | `periodo_academico` |
| `profesores` | `profesores` | `periodo_academico` |
| `egresados` | `egresados` | `graduados_periodo` |
| `investigacion` | `investigacion` | `periodo_academico` |
| `aseguramiento` | `aseguramiento` | `periodo_academico` |
| `infraestructura` | `infraestructura` | `sede` |
| `bienestar` | no está en el xlsx | `periodo_academico` |
| `relaciones-entorno` | no está en el xlsx | `periodo_academico` |

`bienestar` usa `periodo_academico`, `facultad`, `programa`, `genero`, `linea_bienestar`, `servicio`, `beneficiarios` y `valor_invertido_cop`. `relaciones-entorno` usa `periodo_academico`, `facultad`, `programa`, `tipo_relacion`, `aliado`, `sector_aliado`, `ambito`, `fecha_inicio`, `fecha_fin` y `estudiantes_participantes`. El periodo puede ir en el cuerpo del lote y se copia a las filas que no lo traen.

La plantilla escribe `falcultad` y `cantidad estudianes`. La API acepta esas erratas y las guarda como `facultad` y `cantidad_estudiantes`.

Periodo: `2026-1`, `2026-2` o `2026`.

Un lote válido corresponde a un solo ámbito. Al aceptarlo, una transacción borra las filas previas de ese periodo (o de esa sede) e inserta las nuevas. Otro periodo u otra sede no se tocan. Si cualquier fila falla, la respuesta es 400 y no se escribe nada.

Máximo 5.000 registros. Por encima, 413.

## Campos que el GET y Power BI no devuelven

La plantilla no tiene columna de documento. Se excluyen las que identifican a una persona:

| Categoría | Columnas excluidas |
|-----------|--------------------|
| `estudiantes` | `nombre_estudiante`, `codigo_estudiante` |
| `profesores` | `nombre_profesor` |
| `egresados` | `nombre_egresado` |

El resto de categorías no tiene nombre ni documento de persona. `direccion` en infraestructura es la dirección de la sede.

Esas columnas personales sí se pueden enviar y quedan guardadas. No salen en `GET` ni en `v_powerbi_estudiantes`, `v_powerbi_profesores` y `v_powerbi_egresados`.

## Claves

Solo SuperAdmin, con JWT:

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `POST` | `/api/v1/integracion/claves` | 201. Incluye `clave` en claro **una sola vez**. |
| `GET` | `/api/v1/integracion/claves` | 200. Sin clave y sin hash. |
| `POST` | `/api/v1/integracion/claves/{id}/revocar` | 200. La clave deja de servir. |

La base guarda el SHA-256. La comparación usa `crypto.timingSafeEqual`. La clave no se escribe en logs.

Los envíos y las lecturas usan la cabecera `x-api-key`. Límite: 30 POST y 120 GET por minuto y por clave. Al superarlo, 429 con mensaje en español.

## Cómo probarlo

La API local escucha en el puerto 3001. Sustituya la contraseña del SuperAdmin por la de su entorno (en desarrollo, la de `SEMILLA_CLAVE_SUPERADMIN` o la clave de desarrollo de la semilla).

```bash
# 1. Token de SuperAdmin
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"correo":"superadmin@uniautonoma.edu.co","contrasena":"<clave-superadmin>"}'

# 2. Primera clave. Copie body.clave: no se vuelve a mostrar.
curl -s -X POST http://localhost:3001/api/v1/integracion/claves \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"SIGA"}'

# 3. Enviar estudiantes. 200 y { filasOk, filasError: 0, errores: [] }
curl -s -X POST http://localhost:3001/api/v1/integracion/cifras-institucionales/estudiantes/envios \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $CLAVE" \
  -d '{
    "periodo": "2026-1",
    "registros": [{
      "programa": "Ingeniería Agropecuaria",
      "genero": "Femenino",
      "facultad": "Facultad de Ciencias Agrarias",
      "semestre": 5,
      "estrato": 2,
      "valor_dimension": 1,
      "codigo_estudiante": "2020002350129",
      "periodo_academico": "2026-1"
    }]
  }'

# 4. Leer. pagina y limite van en texto. No vienen nombre ni código.
curl -s "http://localhost:3001/api/v1/integracion/cifras-institucionales/estudiantes?periodo=2026-1&pagina=1&limite=20" \
  -H "x-api-key: $CLAVE"

# 5. Bienestar (no tiene hoja en el xlsx)
curl -s -X POST http://localhost:3001/api/v1/integracion/cifras-institucionales/bienestar/envios \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $CLAVE" \
  -d '{
    "periodo": "2026-1",
    "registros": [{
      "facultad": "Facultad de Ingeniería",
      "programa": "Ingeniería de Sistemas",
      "genero": "Femenino",
      "linea_bienestar": "Salud",
      "servicio": "Consulta médica",
      "beneficiarios": 120,
      "valor_invertido_cop": 1500000
    }]
  }'
```

Un lote con `genero` fuera de `Femenino`, `Masculino`, `No binario` o `No informa` responde 400:

```json
{ "filasOk": 0, "filasError": 1, "errores": [{ "fila": 1, "columna": "genero", "mensaje": "La columna genero debe ser uno de: Femenino, Masculino, No binario, No informa." }] }
```

## Migración

Aplicar `Backend/prisma/migrations/20261103160000_camino_2_cifras_institucionales` y `20261105130000_cifras_bienestar_relacion_entorno` (`pnpm prisma:deploy` en `Backend/`). La primera crea `Integrador`, las ocho tablas de cifras, la RLS, las funciones de la clave y las ocho vistas `v_powerbi_*`. La segunda sustituye el modelo clave/valor de bienestar y relaciones con el entorno.

## Historial

- **2026-11-05:** `CifraBienestar` y `CifraRelacionEntorno` pasan de clave/valor a columnas de negocio (`periodo_academico`, programa, etc.).
- **2026-11-03:** implementación en Postgres. Reemplaza la opción B1 del ADR-010.
- **2026-10-13:** contrato inicial y retirada del módulo `/api/v1/cifras`.
