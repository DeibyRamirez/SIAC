# Contrato de API — SIAC

Contrato OpenAPI 3 de los endpoints que ya existen en el backend NestJS. No añade rutas ni cambia códigos de estado, validaciones ni cuerpos de respuesta.

| Artefacto | Ubicación |
|-----------|-----------|
| Documento OpenAPI 3.0 | [`openapi.json`](openapi.json) |
| Generación | `SwaggerModule.createDocument` en `Backend/src/openapi/documento-openapi.ts` |
| Decoradores | Controladores y DTOs (`@nestjs/swagger`) |
| Prueba de coincidencia | `Backend/src/openapi/contrato-openapi.spec.ts` |
| Interfaz HTML | `GET /api/docs`, solo si `NODE_ENV` no es `production` |

El prefijo de todas las rutas es `/api/v1`. En el JSON las rutas ya lo incluyen.

Para regenerar el archivo y comprobar que coincide con el código:

```bash
cd Backend
ESCRIBIR_CONTRATO_OPENAPI=1 pnpm exec jest src/openapi/contrato-openapi.spec.ts --runInBand
pnpm exec jest src/openapi/contrato-openapi.spec.ts --runInBand
```

La prueba levanta el módulo de la API con un Prisma falso (no abre base de datos) y compara el documento, clave por clave, con `openapi.json`.

## Autenticación

Salvo los endpoints marcados como `publico`, cada petición lleva:

```http
Authorization: Bearer <token>
```

El token lo entrega `POST /api/v1/auth/login`. El cuerpo es `{ correo, contrasena }`. El correo debe ser del dominio institucional (`DOMINIO_INSTITUCIONAL`, por defecto `uniautonoma.edu.co`). Una cuenta inactiva recibe 401 y no obtiene token. La contraseña del login exige al menos 4 caracteres; al crear o cambiar un usuario la política es otra: mínimo 8 caracteres, con letras, una mayúscula, un número y un símbolo.

El JWT incluye `sub` (id), `correo` y `rol`. En cada petición `JwtStrategy` vuelve a leer el usuario: si no existe o está inactivo, responde 401. La respuesta de login y de `GET /api/v1/auth/perfil` no incluye la contraseña ni su hash.

`POST /api/v1/auth/google` responde **501**. OAuth institucional sigue pendiente (ADR-003).

### Roles

El enum `RolUsuario` es `Cargador`, `Revisor`, `Administrador` y `SuperAdmin`. El rol Par académico no existe.

`RolesGuard` deja pasar a **SuperAdmin en cualquier endpoint que declare `@Roles`**, aunque SuperAdmin no figure en esa lista. En la tabla de abajo, una fila que dice solo `Administrador` también la puede llamar SuperAdmin. `autenticado` significa cualquiera de los cuatro roles con un JWT válido. `publico` no lleva token.

Además, evidencias y varios recursos de programa pasan por `GuardAlcancePrograma`: un Cargador o un Revisor recibe 403 si el programa no está entre los que tiene asignados. SuperAdmin no queda limitado por ese alcance. Los borradores de una evidencia solo los lee y edita su autor.

## Esquemas de petición y respuesta

Los cuerpos JSON y las consultas tipadas están en `components.schemas` del OpenAPI. Los envíos con archivo son `multipart/form-data` y el campo del archivo se llama `archivo`.

Convenciones que el código ya aplica:

- Textos largos (observaciones y comentarios de dictamen): máximo **600** caracteres.
- Evidencias de guías: archivo **.docx**, máximo **20 MB**. La resolución del MEN es la excepción: **PDF** real, también hasta 20 MB.
- Periodo académico en textos de evidencia: `YYYY-1` o `YYYY-2` (por ejemplo `2026-1`).
- Fechas de resolución y de anexos: `AAAA-MM-DD` (ISO 8601, solo fecha). Las marcas de tiempo de la API (`createdAt`, `updatedAt`, `marcaTiempo`) van en ISO 8601 con hora.
- Crear o actualizar un usuario no devuelve `contrasena`.

Éxito de un ítem: el JSON del recurso, sin envoltura `{ datos }` salvo donde la tabla de paginación lo indica. Un `POST` sin `@HttpCode` responde **201**. `POST /auth/login` y `POST /auth/google` fijan 200; Google no llega a usarlo porque lanza 501.

Listado de evidencias (`GET /api/v1/evidencias`): cada elemento trae las columnas de `Evidencia` (sin el `tsvector` de búsqueda) más `programa` `{ id, nombre, codigo, slug }` y `autor` `{ id, nombre, correo }`. `GET /api/v1/evidencias/{id}` añade el programa completo y las evaluaciones de condición del documento maestro y de la institución.

## Códigos de error

`FiltroExcepcionHttp` unifica los errores en:

```json
{
  "statusCode": 400,
  "message": "texto en español",
  "error": "Bad Request"
}
```

Si class-validator devuelve una lista de mensajes, el filtro la une con `, `. Fuera de `production`, un 500 puede incluir `detalle` con el mensaje de la excepción. En producción ese campo no sale.

| Estado | Cuándo ocurre |
|--------|----------------|
| 400 | Cuerpo o consulta inválidos, o una regla de negocio (`BadRequestException`). Prisma `P2003` y `P2025` (referencia inexistente) también se traducen a 400. |
| 401 | Credenciales incorrectas, correo fuera del dominio, usuario inactivo, token ausente, vencido o de un usuario desactivado. |
| 403 | El rol no está autorizado o el alcance del programa no cubre el recurso. |
| 404 | El registro o el archivo no existe. El almacén local responde 404 si `S3_USAR_ALMACEN_LOCAL` no está activo. |
| 409 | Unicidad (Prisma `P2002`), usuario duplicado, o un ciclo de resolución con documentos pendientes. |
| 501 | `POST /api/v1/auth/google`. |
| 502 | Fallo al hablar con la API de TI o el catálogo externo de carreras. |
| 503 | `GET /api/v1/salud` cuando el ping a la base supera 3 s o no conecta. El filtro reescribe ese fallo al sobre de error; el cuerpo de éxito sí es `{ estado, baseDatos, latenciaBdMs, marcaTiempo }`. |
| 500 | Error no controlado, esquema desactualizado (Prisma `P2022`) u otro código de Prisma. |

No hay límite de tasa: la API no responde 429.

`GET /api/v1/salud` y `POST /api/v1/auth/google` no declaran 400 porque no validan un cuerpo.

## Paginación

No hay un único contrato de página. Cada listado usa los parámetros que ya tenía.

| Recurso | Parámetros | Defecto | Máximo | Respuesta |
|---------|------------|---------|--------|-----------|
| `GET /api/v1/evidencias` y `GET /api/v1/busqueda` | `pagina`, `limite` (texto entero) | 1 y 20 | sin tope | `{ datos \| resultados, total, pagina, limite }` |
| `GET /api/v1/evidencias/mis-revisiones-revisor` | `pagina`, `limite` | 1 y 20 | sin tope; recorta en memoria | `{ datos, total, pagina, limite }` |
| `GET /api/v1/programas/panel` | `page`, `limit` (número) | 1 y 20 | 100 | `{ datos, total, page, limit, totalPaginas }` |
| `GET /api/v1/notificaciones/salida` | `page`, `limit` | 1 y 20 | 100 | Igual que el panel. No incluye el payload del correo. |
| `GET /api/v1/notificaciones` | ninguno | las 50 más recientes | 50 fijas | Arreglo de alertas. |
| `GET /api/v1/busqueda/unificada` | `q`, `limite` | limite 8 | sin tope | `{ evidencias, plantillas, documentos }`. Con `q` de menos de 2 caracteres las tres listas van vacías. |

En el panel, si la consulta trae `semaforo`, el semáforo se calcula sobre todas las filas y la página se arma después. Sin ese filtro, `skip`/`take` corren en la base.

Un entero mal formado en `pagina` o `limite` de evidencias responde 400 (`pagina debe ser un número entero.`).

## Endpoints y roles

La columna Rol es la de `x-siac-roles` en el OpenAPI. Recordatorio: SuperAdmin atraviesa cualquier lista de `@Roles`.

| Método | Ruta | Rol | Qué hace |
|--------|------|-----|----------|
| GET | `/api/v1/acreditacion/etapas` | autenticado | Lista las etapas de la estructura de acreditación |
| GET | `/api/v1/almacen-local/*path` | autenticado | Sirve un archivo del disco local |
| GET | `/api/v1/aprobacion/pendientes` | Revisor, Administrador | Lista evidencias en revisión (alias histórico) |
| POST | `/api/v1/auth/google` | publico | OAuth Google institucional (no habilitado) |
| POST | `/api/v1/auth/login` | publico | Inicia sesión con correo institucional y contraseña |
| GET | `/api/v1/auth/perfil` | autenticado | Devuelve el usuario de la sesión |
| GET | `/api/v1/busqueda` | autenticado | Busca evidencias con los mismos filtros que el listado |
| GET | `/api/v1/busqueda/unificada` | autenticado | Busca evidencias, plantillas y anexos a la vez |
| GET | `/api/v1/configuracion/vigencia` | SuperAdmin, Administrador | Consulta los umbrales de vigencia del semáforo |
| PATCH | `/api/v1/configuracion/vigencia` | SuperAdmin, Administrador | Actualiza los umbrales de vigencia |
| POST | `/api/v1/estructura/carpetas` | Administrador | Crea una carpeta |
| PATCH | `/api/v1/estructura/carpetas/{id}` | Administrador | Actualiza una carpeta |
| DELETE | `/api/v1/estructura/carpetas/{id}` | Administrador | Elimina una carpeta |
| POST | `/api/v1/estructura/documentos` | Administrador | Crea un documento requerido |
| PATCH | `/api/v1/estructura/documentos/{id}` | Administrador | Actualiza un documento requerido |
| DELETE | `/api/v1/estructura/documentos/{id}` | Administrador | Elimina un documento requerido |
| GET | `/api/v1/estructura/etapas` | autenticado | Lista etapas, carpetas y documentos requeridos |
| POST | `/api/v1/estructura/etapas` | Administrador | Crea una etapa |
| PATCH | `/api/v1/estructura/etapas/{id}` | Administrador | Actualiza una etapa |
| DELETE | `/api/v1/estructura/etapas/{id}` | Administrador | Elimina una etapa |
| GET | `/api/v1/evidencias` | autenticado | Lista evidencias visibles para el usuario |
| POST | `/api/v1/evidencias` | Cargador | Crea una evidencia con archivo |
| GET | `/api/v1/evidencias/conteos` | autenticado | Cuenta evidencias por estado dentro del alcance |
| GET | `/api/v1/evidencias/mis-revisiones-revisor` | Revisor | Envíos a revisión del revisor, paginados |
| POST | `/api/v1/evidencias/parsear-excel` | Cargador, Administrador | Lee un Excel y devuelve filas interpretadas, sin guardarlas |
| GET | `/api/v1/evidencias/periodos` | autenticado | Lista periodos que tienen documentos visibles |
| GET | `/api/v1/evidencias/{id}` | autenticado | Obtiene una evidencia |
| PATCH | `/api/v1/evidencias/{id}` | Cargador | Actualiza metadatos de un borrador propio |
| DELETE | `/api/v1/evidencias/{id}` | Cargador | Elimina un borrador propio |
| PATCH | `/api/v1/evidencias/{id}/archivo` | Cargador | Reemplaza el archivo de un borrador propio |
| GET | `/api/v1/evidencias/{id}/comentarios` | autenticado | Comentarios de la evidencia |
| GET | `/api/v1/evidencias/{id}/contenido` | autenticado | Contenido binario del documento |
| GET | `/api/v1/evidencias/{id}/descargar` | autenticado | URL firmada del archivo |
| POST | `/api/v1/evidencias/{id}/dictamen` | Revisor | Dictamina una evidencia en revisión |
| POST | `/api/v1/evidencias/{id}/enviar-revision` | Cargador | Envía la evidencia a revisión |
| GET | `/api/v1/evidencias/{id}/evaluaciones-condicion` | autenticado | Checklist G1 de una revisión |
| GET | `/api/v1/evidencias/{id}/evaluaciones-condicion-institucional` | autenticado | Checklist G3 de una revisión |
| GET | `/api/v1/evidencias/{id}/historial` | autenticado | Historial de estados de la evidencia |
| POST | `/api/v1/evidencias/{id}/reemplazo-documento` | Revisor, Administrador | Reemplaza el documento aunque esté validado |
| GET | `/api/v1/evidencias/{id}/versiones` | autenticado | Lista las versiones del documento |
| GET | `/api/v1/evidencias/{id}/versiones/{a}/diff/{b}` | autenticado | Compara dos versiones del documento |
| GET | `/api/v1/institucion` | Administrador, SuperAdmin | Datos de la institución |
| PATCH | `/api/v1/institucion` | Administrador, SuperAdmin | Actualiza el trámite activo de la institución |
| GET | `/api/v1/institucion/progreso` | Administrador, SuperAdmin, Cargador, Revisor | Progreso del trámite institucional |
| POST | `/api/v1/institucion/resolucion` | Administrador, SuperAdmin | Carga la resolución MEN de la institución (PDF) |
| GET | `/api/v1/institucion/resumen` | Administrador, SuperAdmin, Cargador, Revisor | Resumen institucional |
| GET | `/api/v1/integracion/estado-storage` | Administrador, SuperAdmin | Estado de la conexión de almacenamiento y de cada bucket |
| POST | `/api/v1/integracion/sincronizar` | Administrador | Sincroniza programas, usuarios y vínculos desde la API de TI |
| POST | `/api/v1/integracion/sincronizar-carreras` | Administrador, SuperAdmin | Sincroniza el catálogo de carreras desde la API externa |
| POST | `/api/v1/integracion/sincronizar-csv` | Administrador | Sincroniza programas desde un CSV |
| GET | `/api/v1/metricas/token` | Administrador | Token de embebido Power BI (alias de /powerbi/embed-token) |
| GET | `/api/v1/notificaciones` | autenticado | Lista las alertas en la aplicación del usuario |
| PATCH | `/api/v1/notificaciones/marcar-todas-leidas` | autenticado | Marca como leídas las alertas del usuario |
| GET | `/api/v1/notificaciones/salida` | Administrador, SuperAdmin | Bitácora del outbox de correo |
| PATCH | `/api/v1/notificaciones/{id}/leida` | autenticado | Marca una alerta como leída |
| GET | `/api/v1/plantillas` | autenticado | Lista plantillas vigentes |
| POST | `/api/v1/plantillas` | Administrador, Revisor | Crea una plantilla .docx |
| PATCH | `/api/v1/plantillas/{id}` | Administrador, Revisor | Actualiza metadatos de una plantilla |
| DELETE | `/api/v1/plantillas/{id}` | Administrador, Revisor | Deja la plantilla no vigente |
| PATCH | `/api/v1/plantillas/{id}/archivo` | Administrador, Revisor | Reemplaza el archivo de la plantilla |
| GET | `/api/v1/plantillas/{id}/contenido` | autenticado | Contenido binario de la plantilla |
| GET | `/api/v1/plantillas/{id}/descargar` | autenticado | URL firmada de la plantilla |
| GET | `/api/v1/powerbi/embed-token` | Administrador, SuperAdmin | Token o URL de embebido |
| GET | `/api/v1/powerbi/informes` | Administrador, SuperAdmin | Lista el catálogo de informes y si cada URL pública está configurada |
| PUT | `/api/v1/powerbi/informes/{categoriaId}` | Administrador, SuperAdmin | Guarda la URL de «Publicar en la web» |
| GET | `/api/v1/powerbi/informes/{categoriaId}/url` | Administrador, SuperAdmin | Devuelve la URL pública de una categoría |
| GET | `/api/v1/programas` | autenticado | Lista programas con semáforo, según el alcance del usuario |
| POST | `/api/v1/programas` | Administrador, SuperAdmin | Crea un programa |
| GET | `/api/v1/programas/avance-institucional` | Administrador, SuperAdmin | Calcula el avance institucional |
| GET | `/api/v1/programas/panel` | Administrador, SuperAdmin | Panel paginado de programas o de la institución |
| GET | `/api/v1/programas/{id}` | autenticado | Obtiene un programa |
| PATCH | `/api/v1/programas/{id}` | Administrador, SuperAdmin | Actualiza los datos de un programa |
| PATCH | `/api/v1/programas/{id}/estado` | Administrador, SuperAdmin | Activa o desactiva un programa |
| POST | `/api/v1/programas/{id}/iniciar-ciclo-renovacion` | Administrador, SuperAdmin | Inicia un ciclo de renovación del programa |
| GET | `/api/v1/programas/{id}/progreso` | autenticado | Progreso del trámite del programa |
| POST | `/api/v1/programas/{id}/resolucion` | Administrador, SuperAdmin | Carga la resolución MEN del programa (PDF) |
| GET | `/api/v1/programas/{id}/vigencia` | autenticado | Semáforo de vigencia del programa |
| GET | `/api/v1/salud` | publico | Estado del servicio y ping a la base de datos |
| GET | `/api/v1/usuarios` | Administrador, SuperAdmin | Lista usuarios con sus programas asignados |
| POST | `/api/v1/usuarios` | SuperAdmin | Crea un usuario |
| PATCH | `/api/v1/usuarios/{id}` | SuperAdmin | Actualiza datos de un usuario |
| DELETE | `/api/v1/usuarios/{id}` | SuperAdmin | Desactiva un usuario (baja lógica) |
| PUT | `/api/v1/usuarios/{id}/alcance-institucional` | Administrador, SuperAdmin | Asigna o quita la responsabilidad del proceso institucional |
| GET | `/api/v1/usuarios/{id}/programas` | Administrador, SuperAdmin | Lista los programas asignados a un usuario |
| PUT | `/api/v1/usuarios/{id}/programas` | Administrador, SuperAdmin | Reemplaza los programas asignados |
| PATCH | `/api/v1/usuarios/{id}/rol` | SuperAdmin | Cambia el rol de un usuario |
| GET | `/api/v1/vigencias` | autenticado | Lista anexos de vigencia |
| GET | `/api/v1/vigencias/anexos` | autenticado | Lista anexos de vigencia |
| POST | `/api/v1/vigencias/con-archivo` | Administrador | Crea un anexo de vigencia con archivo |
| POST | `/api/v1/vigencias/demo/detener` | Administrador, SuperAdmin | Detiene la demo de vigencia |
| GET | `/api/v1/vigencias/demo/estado` | Administrador, SuperAdmin | Estado de la demo acelerada de vigencia |
| POST | `/api/v1/vigencias/demo/iniciar` | Administrador, SuperAdmin | Inicia la demo acelerada de vigencia |
| POST | `/api/v1/vigencias/ejecutar-cron` | Administrador | Ejecuta a mano el recálculo diario de vigencias |
| GET | `/api/v1/vigencias/paquetes-registro` | autenticado | Lista paquetes de registro calificado |
| PATCH | `/api/v1/vigencias/{id}` | Administrador, Revisor | Actualiza un anexo de vigencia |
| DELETE | `/api/v1/vigencias/{id}` | Administrador | Elimina un anexo de vigencia |
| GET | `/api/v1/vigencias/{id}/descargar` | autenticado | URL firmada del anexo |

El detalle de cada operación (campos, ejemplos y códigos) está en [`openapi.json`](openapi.json).

## Contrato de datos para Power BI

Este contrato de **lectura** no es un endpoint HTTP nuevo. Power BI no pide filas a `/api/v1`. Lee PostgreSQL con un rol propio. Los endpoints `/api/v1/powerbi/*` y `/api/v1/metricas/token` solo administran la URL pública del informe y el token de embebido; no consultan la vista.

### Quién puede leer

| Pieza | Regla |
|-------|--------|
| Rol | `siac_powerbi_lectura` |
| Atributos | `NOLOGIN` hasta que operaciones lo habilite, `NOBYPASSRLS`, `default_transaction_read_only = on` |
| Objeto | `SELECT` sobre `v_powerbi_puntajes` y las columnas que esa vista necesita |
| Vista | `security_invoker = true`: aplica los permisos y la RLS de quien consulta |
| Fuera de alcance | `Usuario`, contraseñas, correos, autor, revisor, observaciones, nombres de archivo, borradores y cualquier `INSERT`/`UPDATE`/`DELETE` |

La contraseña del rol no vive en el repositorio. Se define en Supabase, como describe `docs/despliegue.md` §9.

### Vista `v_powerbi_puntajes`

Una fila por guía con puntaje (la evidencia más reciente que no es borrador):

| Guía | Alcance | Puntaje |
|------|---------|---------|
| G1 | Programa | n/9 |
| G3 | Institución | n/6 |

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `evidenciaId` | texto | no | Id de la evidencia |
| `alcance` | texto | no | `Programa` o `Institucion` |
| `programaId` | texto | sí | Nulo en G3 |
| `codigoPrograma` | texto | sí | Código del programa |
| `programa` | texto | sí | Nombre del programa, o el de la institución en G3 |
| `facultad` | texto | sí | Facultad del programa |
| `nivel` | texto | sí | Nivel del programa |
| `codigoGuia` | texto | no | `G1` o `G3` |
| `periodo` | texto | no | `YYYY-1` o `YYYY-2` |
| `estado` | texto | no | Estado de la evidencia, nunca `Borrador` |
| `puntaje` | entero | sí | Condiciones que cumplen |
| `totalCondiciones` | entero | no | 9 en G1 y 6 en G3 si el documento no trae total |
| `puntajeTexto` | texto | sí | `puntaje` y total unidos, por ejemplo `5/9`. Nulo si no hay puntaje |
| `condicionesCumplidas` | entero | no | Del último dictamen (mayor `numeroRevision`) |
| `condicionesNoCumplidas` | entero | no | Del mismo dictamen |
| `fechaResolucion` | fecha | sí | Resolución del programa o de la institución |
| `semaforoVigencia` | texto | no | `Verde`, `Amarillo`, `Rojo`, `Vencido` o `SinVigencia` |
| `actualizadoEn` | fecha-hora | no | `updatedAt` de la evidencia |

Programas inactivos no aparecen. No hay datos personales.

**Porcentajes.** Esta vista no usa un porcentaje. El puntaje es un entero `n` sobre `totalCondiciones`, y `puntajeTexto` lo escribe como `n/total`. No se convierte a fracción 0–1 ni a un float. El semáforo es una etiqueta, no un número.

**Fechas.** `fechaResolucion` es fecha de calendario. `actualizadoEn` es marca de tiempo. Un cliente que serialice a JSON debe usar ISO 8601 (`2026-03-15` y `2026-03-15T18:04:00.000Z`).

La vista no se pagina: es un `SELECT` completo. Los topes de página de la sección anterior son solo de la API HTTP.

### Seis dominios

El contrato de datos cubre solo estos dominios, alineados con el catálogo de informes y con `Backend/prisma/datos/variables-cifras.json`:

| Dominio | `categoriaId` | Qué describe el catálogo de variables |
|---------|---------------|----------------------------------------|
| Aseguramiento | `aseguramiento` | Registros calificados, programas acreditados, acreditables y vencimientos por año |
| Infraestructura | `infraestructura` | Espacios, área en m² y capacidad, por tipo |
| Egresados | `egresados` | Graduados, por nivel y por género |
| Investigación | `investigacion` | Grupos, investigadores, semilleros, patentes y productos |
| Profesores | `profesores` | Planta por vinculación, dedicación, escalafón y nivel de estudio |
| Estudiantes | `estudiantes` | Matrícula, nuevos, género, estrato, procedencia, discapacidad y grupo étnico |

Esas variables son conteos, metros cuadrados o capacidad. **Ninguna de las seis usa unidad porcentaje.** Si más adelante una cifra de estos dominios fuera una tasa, se expresará como número de 0 a 100 con un decimal (unidad `porcentaje`), nunca como fracción entre 0 y 1.

`bienestar` y `relaciones-entorno` siguen en el catálogo HTTP de informes (ocho `categoriaId` al guardar una URL). Quedan **fuera** de este contrato de datos. La hoja LM del Excel maestro tampoco entra: no pertenece a SIAC.

Los seis dominios no tienen filas en Postgres. Las tablas de cifras se retiraron (`20261013230000_eliminar_cifras_institucionales`). Hoy el informe se alimenta del Excel maestro y SIAC solo embebe la URL. La única lectura SQL autorizada para `siac_powerbi_lectura` es `v_powerbi_puntajes`.

No existe `GET /api/v1/powerbi/datos/{dominio}`. No se implementa hasta que el responsable del producto apruebe un feed.

### Lo que SIAC todavía no tiene

- Filas de estudiantes, profesores o egresados (no hay documento, correo ni teléfono de personas en la vista ni en un feed).
- Series históricas de las variables de los seis dominios dentro de Postgres.
- Un periodo `YYYY-1` / `YYYY-2` ligado a esas variables: el periodo de la vista es el del documento guía, no el de la matrícula.
- Porcentajes de deserción o permanencia en este contrato (esas tasas están en bienestar, que queda fuera).
- Paginación `pagina` / `tamano` para la vista: no hay API de filas. Si se aprueba un feed, el tamaño por defecto sería 100 y el máximo 500, con `{ datos, pagina, tamano, total }`, pero eso no forma parte del comportamiento actual.
