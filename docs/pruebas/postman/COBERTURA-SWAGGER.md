# Matriz de cobertura Swagger → colección Postman

Generado: 2026-11-07T20:35:32.078Z

## Conteo

| Concepto | Cantidad |
|----------|----------:|
| Operaciones HTTP en `openapi.json` | **108** |
| Cubiertas en carpetas API (sin duplicar login/perfil/salud) | **105** |
| Cubiertas solo en 00 / 98 (login, salud, perfil/errores) | **3** |
| **Total cubiertas (108)** | **108** |

Desglose de las 4 rutas que antes parecían “faltantes”: 3 son login/salud/perfil (no se repiten en API) + 1 es el wildcard `*path` cubierto con **ruta concreta** y archivo de fixture.

| Método | Ruta | Dónde en la colección | Notas |
|--------|------|------------------------|-------|
| GET | `/api/v1/acreditacion/etapas` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/almacen-local/*path` | SIAC-api-v1 (carpeta API) | Ruta concreta GET /almacen-local/{{almacenClavePrueba}} (fixture de archivo en preparar-fixtures-newman). |
| GET | `/api/v1/aprobacion/pendientes` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/auth/google` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/auth/login` | 00 — Preparación (login×4) | No duplicada en carpetas API; cubierta en preparación o negativo. |
| GET | `/api/v1/auth/perfil` | 98 — Negativo / 00 | No duplicada en carpetas API; cubierta en preparación o negativo. |
| GET | `/api/v1/busqueda` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/busqueda/unificada` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/configuracion/vigencia` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/configuracion/vigencia` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/documentos/periodos` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/documentos/periodos/actual` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/estructura/carpetas` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/estructura/carpetas/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/estructura/carpetas/{id}` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/estructura/documentos` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/estructura/documentos/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/estructura/documentos/{id}` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/estructura/etapas` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/estructura/etapas` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/estructura/etapas/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/estructura/etapas/{id}` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/evidencias` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/conteos` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/mis-revisiones-revisor` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/evidencias/parsear-excel` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/periodos` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/evidencias/{id}` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/evidencias/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/evidencias/{id}/archivo` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/comentarios` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/contenido` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/descargar` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/evidencias/{id}/dictamen` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/evidencias/{id}/enviar-revision` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/evaluaciones-condicion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/evaluaciones-condicion-institucional` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/historial` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/evidencias/{id}/reemplazo-documento` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/versiones` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/evidencias/{id}/versiones/{a}/diff/{b}` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/institucion` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/institucion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/institucion/progreso` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/institucion/resolucion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/institucion/resumen` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/integracion/cifras-institucionales/{categoria}` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/integracion/cifras-institucionales/{categoria}/envios` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/integracion/claves` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/integracion/claves` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/integracion/claves/{id}/revocar` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/integracion/estado-storage` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/integracion/sincronizar` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/integracion/sincronizar-carreras` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/integracion/sincronizar-csv` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/metricas/token` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/notificaciones` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/notificaciones/marcar-todas-leidas` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/notificaciones/salida` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/notificaciones/{id}/leida` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/plantillas` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/plantillas` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/plantillas/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/plantillas/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/plantillas/{id}/archivo` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/plantillas/{id}/contenido` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/plantillas/{id}/descargar` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/powerbi/embed-token` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/powerbi/informes` | SIAC-api-v1 (carpeta API) | — |
| PUT | `/api/v1/powerbi/informes/{categoriaId}` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/powerbi/informes/{categoriaId}/url` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/powerbi/insercion` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/powerbi/insercion` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/powerbi/probar-conexion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/powerbi/token-insercion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/programas` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/programas` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/programas/avance-institucional` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/programas/panel` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/programas/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/programas/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/programas/{id}/estado` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/programas/{id}/iniciar-ciclo-renovacion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/programas/{id}/progreso` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/programas/{id}/resolucion` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/programas/{id}/vigencia` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/salud` | 00 — Preparación | No duplicada en carpetas API; cubierta en preparación o negativo. |
| GET | `/api/v1/usuarios` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/usuarios` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/usuarios/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/usuarios/{id}` | SIAC-api-v1 (carpeta API) | — |
| PUT | `/api/v1/usuarios/{id}/alcance-institucional` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/usuarios/{id}/programas` | SIAC-api-v1 (carpeta API) | — |
| PUT | `/api/v1/usuarios/{id}/programas` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/usuarios/{id}/rol` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/vigencias` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/vigencias/anexos` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/vigencias/con-archivo` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/vigencias/demo/detener` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/vigencias/demo/estado` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/vigencias/demo/iniciar` | SIAC-api-v1 (carpeta API) | — |
| POST | `/api/v1/vigencias/ejecutar-cron` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/vigencias/paquetes-registro` | SIAC-api-v1 (carpeta API) | — |
| DELETE | `/api/v1/vigencias/{id}` | SIAC-api-v1 (carpeta API) | — |
| PATCH | `/api/v1/vigencias/{id}` | SIAC-api-v1 (carpeta API) | — |
| GET | `/api/v1/vigencias/{id}/descargar` | SIAC-api-v1 (carpeta API) | — |

## Almacenamiento local

`GET /api/v1/almacen-local/*path` en OpenAPI es plantilla de ruta. Newman usa `GET /api/v1/almacen-local/{{almacenClavePrueba}}` con archivo creado en `Backend/prisma/preparar-fixtures-newman.ts`. En Nest 10, `@Get('*path')` no registraba la ruta (404 genérico «Cannot GET…»); corregido a `@Get('*')` + comprobación `existeArchivoLocal` → 404 de negocio si falta el archivo. No hay E2E HTTP de esta ruta en supertest (las E2E usan `AlmacenamientoMemoria`).

