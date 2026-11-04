# Camino 2 — API de cifras institucionales (implementada)

> **Estado:** implementado (migración `20261104090000_camino2_cifras_institucionales`, ADR-010 aceptada).  
> Camino 1 (Excel maestro → Power BI → URL embebida) **no cambia**. Camino 2 es un segundo alimento: JSON → PostgreSQL → vistas de solo lectura.

## Dos caminos hacia el dashboard

| Camino | Origen | Qué hace SIAC | Qué lee Power BI |
|--------|--------|---------------|------------------|
| 1 | Excel maestro (Drive/servidor) | Guarda la URL de «Publicar en la web» | El archivo Excel |
| 2 | Sistemas externos (FEAT, SIGA, …) | Valida el lote y reemplaza filas en Postgres | Vistas `v_powerbi_cifras_*` con el rol `siac_powerbi_lectura` |

La Data API de Supabase (`https://<proyecto>.supabase.co/rest/v1`) **no** se abre. El mismo SQL corre en Supabase y en el PostgreSQL de producción.

## Autenticación

1. Un Administrador inicia sesión (`POST /api/v1/auth/login`) y crea una clave:

```http
POST /api/v1/integracion/cifras-institucionales/claves
Authorization: Bearer <jwt>
Content-Type: application/json

{ "nombre": "FEAT", "categorias": ["estudiantes"] }
```

La respuesta incluye `secreto` **una sola vez** (empieza por `siac_live_`). El servidor solo guarda el hash SHA-256.

2. FEAT envía lotes con esa clave:

```http
POST /api/v1/integracion/cifras-institucionales/estudiantes/envios
Content-Type: application/json
x-api-key: siac_live_...
```

## URLs

| Entorno | Base |
|---------|------|
| Local | `http://localhost:3001/api/v1` |
| Swagger (no producción) | `http://localhost:3001/api/docs` |
| Render | `https://<servicio>.onrender.com/api/v1` |
| BFF del frontend | `https://sistema-siac.vercel.app/api/v1` (el navegador no llama a Render; Postman sí puede) |

## Endpoints

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/integracion/cifras-institucionales/claves` | JWT Administrador |
| GET | `/integracion/cifras-institucionales/claves` | JWT Administrador |
| PATCH | `/integracion/cifras-institucionales/claves/{id}` | JWT Administrador |
| DELETE | `/integracion/cifras-institucionales/claves/{id}` | JWT Administrador (revoca) |
| GET | `/integracion/cifras-institucionales/{categoriaId}/esquema` | JWT Admin o `x-api-key` |
| GET | `/integracion/cifras-institucionales/{categoriaId}/datos` | JWT Admin o `x-api-key` |
| POST | `/integracion/cifras-institucionales/{categoriaId}/envios` | `x-api-key` |

`categoriaId`: `estudiantes`, `profesores`, `egresados`, `investigacion`, `aseguramiento`, `infraestructura`, `bienestar`, `relaciones-entorno`.

## Ejemplo Postman (estudiantes)

**POST** `http://localhost:3001/api/v1/integracion/cifras-institucionales/estudiantes/envios`

Headers: `Content-Type: application/json`, `x-api-key: <secreto>`

```json
{
  "periodo": "2026-1",
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

`nombre_estudiante` es opcional y personal: se guarda, no sale en `GET .../datos` ni en `v_powerbi_cifras_estudiantes`.

Respuesta 201:

```json
{ "filasOk": 1, "filasError": 0, "errores": [], "envioId": "..." }
```

Si una fila es inválida: **400** `{ "statusCode": 400, "codigo": "CIFRAS_LOTE_INVALIDO", "errores": [{ "fila": 1, "columna": "semestre", "mensaje": "..." }] }` y **no se escribe nada**.

El lote **reemplaza** las filas previas de ese periodo (en infraestructura, de esas `sede`). Máximo 5000 filas.

## Ejemplo clave/valor (bienestar)

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

## Power BI

Conectar con el conector PostgreSQL y el usuario `siac_powerbi_lectura` (en Supabase: `siac_powerbi_lectura.<ref>` al pooler 5432). Vistas:

- `v_powerbi_cifras_estudiantes`
- `v_powerbi_cifras_profesores`
- `v_powerbi_cifras_egresados`
- `v_powerbi_cifras_investigacion`
- `v_powerbi_cifras_aseguramiento`
- `v_powerbi_cifras_infraestructura`
- `v_powerbi_cifras_bienestar`
- `v_powerbi_cifras_relaciones_entorno`

Colección Postman: [`docs/postman/camino-2-cifras.postman_collection.json`](postman/camino-2-cifras.postman_collection.json).
