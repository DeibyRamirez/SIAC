# SIAC — Sistema Interno de Aseguramiento de la Calidad

Plataforma web de la **Corporación Universitaria Autónoma del Cauca (CUAC)** para cargar, revisar, versionar y consultar las evidencias de autoevaluación y acreditación de programas e institución, en el marco del **Decreto 1330 de 2019**.

El repositorio es un monorepo: frontend en Next.js y backend en NestJS. El rol que carga evidencias se llama **Cargador** en la base de datos y en la API, y se muestra como **Profesor** en la interfaz.

Repositorio: [https://github.com/DeibyRamirez/SIAC](https://github.com/DeibyRamirez/SIAC).

## Qué problema resuelve

Antes de SIAC, las evidencias de registro calificado y de mejoramiento se gestionaban de forma dispersa, con poca trazabilidad entre la plantilla oficial, la versión enviada, el dictamen del revisor y la vigencia del programa.

SIAC centraliza ese ciclo:

1. El Profesor descarga la plantilla oficial (guías **G1** a **G4**) y carga el documento Word de la evidencia.
2. Envía el documento a revisión.
3. El Revisor dictamina (Cumple o Con observaciones), puede comentar sobre el visor y, si corresponde, publicar una versión corregida o una nueva versión firmada.
4. El Administrador sigue el avance por programa e institución, las vigencias del registro calificado y los informes de Power BI.
5. El SuperAdmin crea las cuentas y las claves con las que otros sistemas envían cifras institucionales.

Las cuatro guías son: **G1** documento maestro de programa, **G2** respaldo de mejoramiento de programa, **G3** documento maestro institucional y **G4** respaldo de mejoramiento institucional. G2 espera a que G1 esté aprobado; G4 espera a G3.

## Entorno publicado

Comprobado el 18 de noviembre de 2026 (hora de Bogotá):

| Pieza | Dirección |
|-------|-----------|
| Aplicación web | [https://siac-one.vercel.app](https://siac-one.vercel.app) (el acceso abre `/login`) |
| API | [https://siac-backend-tad8.onrender.com/api/v1](https://siac-backend-tad8.onrender.com/api/v1) |
| Salud del backend | [https://siac-backend-tad8.onrender.com/api/v1/salud](https://siac-backend-tad8.onrender.com/api/v1/salud) — responde `{ "estado": "ok", "baseDatos": "ok", ... }` cuando PostgreSQL contesta |

Swagger del backend: `https://siac-backend-tad8.onrender.com/api/docs`. En producción solo se publica si en Render están `SWAGGER_HABILITADO=true`, `SWAGGER_USUARIO` y `SWAGGER_CLAVE`, y pide usuario y clave (HTTP Basic). Sin esas variables responde 404. Véase [Documentación de la API](#documentación-de-la-api).

El plan declarado para el backend en [`render.yaml`](render.yaml) es el plan gratuito de Render: el servicio puede dormirse tras unos 15 minutos sin tráfico. El arranque en frío puede tardar cerca de un minuto. El workflow [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) hace `GET /api/v1/salud` cada 10 minutos cuando está configurada la variable de repositorio `BACKEND_URL`.

No hay cuentas de demostración en el repositorio: `pnpm prisma:seed` no crea usuarios. Las cuentas las crea el SuperAdmin.

## Roles

El enum `RolUsuario` en Prisma es `Cargador`, `Revisor`, `Administrador` y `SuperAdmin`. El rol Par académico no existe (se retiró el 20 de octubre de 2026). El correo de acceso debe pertenecer al dominio institucional (`DOMINIO_INSTITUCIONAL`, por defecto `uniautonoma.edu.co`).

`RolesGuard` deja pasar a SuperAdmin en cualquier endpoint que declare `@Roles`. Cargador y Revisor quedan limitados a los programas que tienen asignados (`GuardAlcancePrograma`).

| Rol (API / BD) | Nombre en la interfaz | Qué puede hacer |
|----------------|-----------------------|-----------------|
| Cargador | Profesor | Descargar plantillas G1–G4, cargar evidencias `.docx` (hasta 20 MB), enviarlas a revisión, consultar las suyas y subir una versión corregida cuando el dictamen queda con observaciones. |
| Revisor | Revisor | Ver la bandeja de sus programas, dictaminar con checklist y visor del documento, consultar el historial en «Mis revisiones», **cargar un trámite corregido** y publicarlo como verificado, y **subir una nueva versión** (con vista previa y verificación de firma del documento descargado desde SIAC). |
| Administrador | Administrador | Consultar programas e institución (avance G1–G4, semáforo y vigencia), dashboard de métricas e informes Power BI, vigencias y alertas, asignación de programas, evidencias del periodo, biblioteca de plantillas, bandeja de revisión global y el panel de estructura normativa. |
| SuperAdmin | SuperAdmin | Crear, desactivar y reactivar usuarios, asignar roles y programas, gestionar **claves de integración** (la clave se muestra una sola vez) y abrir los módulos de Profesor, Revisor y Administrador. El primer SuperAdmin se crea con `pnpm prisma:primer-admin`. |

## Funcionalidades principales

- **Autenticación JWT** con correo institucional y contraseña. La sesión del navegador queda en la cookie HttpOnly `siac_sesion`; el BFF de Next.js reenvía las llamadas al API con `Authorization: Bearer`. Límite de **5 intentos de inicio de sesión por IP y por minuto** (`POST /auth/login`); al superarlo responde 429. El botón de Google está en la pantalla de acceso, pero no permite entrar: el frontend avisa que estará disponible en la versión institucional y `POST /api/v1/auth/google` responde **501**.
- **Biblioteca de plantillas** oficiales en `.docx`, versionadas, para las guías G1–G4.
- **Carga y ciclo de evidencias**: borrador, envío a revisión, dictamen, historial, comentarios y versiones. El periodo académico se expresa como `YYYY-1` o `YYYY-2`.
- **Carga verificada del Revisor**: desde «Cargar trámite» puede publicar un G1–G4 como Cumple o Validado (`publicarComoVerificado`), sin depender del Profesor.
- **Versiones del Revisor**: desde «Mis revisiones» puede usar «Subir nueva versión». El flujo incluye vista previa del Word y verificación de firma; el backend revalida la firma y la versión de origen antes de publicar (`/evidencias/{id}/versiones/revisor` y `/firma/verificar`).
- **Vigencias del registro calificado**: el Administrador registra la resolución del MEN (PDF, hasta 20 MB). La vigencia se calcula a siete años desde la fecha de la resolución. Hay semáforo (sin vigencia, vigente, próximo a vencer, por vencer, vencido), anexos y un cron diario a las 06:00 en `America/Bogota`.
- **Programas e institución**: panel con avance y semáforo; sincronización del catálogo de carreras CUAC (solo campos de catálogo) y, si se usa, carga por CSV.
- **Búsqueda** de evidencias y un buscador global (atajo Ctrl+K).
- **Notificaciones** en la campana (alertas in-app) y salida de correo con bandeja de reintentos (`NotificacionSalida`). El canal de correo puede ser Resend, SMTP o ninguno.
- **Power BI**: el Administrador registra enlaces `reportEmbed` de `app.powerbi.com` y los consulta en la pestaña Power BI del dashboard. Las filas no pasan por la API en ese modo. El modo Azure (App Owns Data / token de inserción) existe en el backend y queda apagado por defecto; no hay interfaz para activarlo en el frontend actual.
- **Cifras institucionales**: ingestión por categoría con cabecera `x-api-key`. El SuperAdmin emite y revoca las claves. Esa API tiene límite propio (30 POST y 120 GET por minuto y por clave).
- **Almacenamiento** de evidencias, plantillas y documentos: disco local en desarrollo, o Storage compatible con S3 (en el despliegue publicado, Supabase Storage) en los buckets `evidencias`, `plantillas` y `documentos`.

## Arquitectura y stack

El navegador solo habla con el frontend. Next.js guarda la sesión y el BFF (`/api/sesion` y `/api/v1/*`) llama a NestJS.

```text
Navegador → Vercel (Next.js 16 + BFF) → Render (NestJS /api/v1)
                                        → Supabase PostgreSQL (pooler)
                                        → Supabase Storage (API S3)
              iframe opcional → app.powerbi.com
```

En local el navegador abre `http://localhost:3000` y el BFF llama a `http://localhost:3001/api/v1`.

| Capa | Tecnología | Notas |
|------|------------|-------|
| Frontend | Next.js 16.3.3, React 19, Tailwind 4, Vitest | App Router. Variable de servidor obligatoria en producción: `API_URL_INTERNAL`. |
| Backend | NestJS 10, Prisma 6, Passport JWT, `@nestjs/swagger` 8, `@nestjs/throttler` 6 | Prefijo `/api/v1`. Arranque de producción: `pnpm start:despliegue`. |
| Ejecución | Node.js 24.x, pnpm 10.33.2 | Fijado en `engines.node` y en `packageManager` de Backend y Frontend. |
| Base de datos | PostgreSQL 16 | Local: Docker (`postgres:16` en el puerto **5433**). Publicada: Supabase (la app usa el pooler en 6543; las migraciones, el modo sesión en 5432). |
| Archivos | Disco local o S3 | En Render el disco es efímero: `S3_USAR_ALMACEN_LOCAL` debe ser `false`. |
| Contenedores (opcional) | `Backend/Dockerfile`, `Frontend/Dockerfile`, `docker-compose.prod.yml` | Pensado para un servidor universitario. La base de datos sigue siendo externa. Guía: [`docs/despliegue-docker.md`](docs/despliegue-docker.md). |
| Despliegue actual | Vercel + Render + Supabase | Blueprint del backend: [`render.yaml`](render.yaml). Guía: [`docs/despliegue.md`](docs/despliegue.md). |

## Estructura del repositorio

```text
SIAC/
├── Backend/                     NestJS, Prisma, migraciones y pruebas
│   ├── src/                     Módulos: auth, usuarios, documentos, plantillas,
│   │                            programas, vigencias, notificaciones, powerbi,
│   │                            cifras-institucionales, integracion, etc.
│   ├── prisma/schema.prisma     Modelo de datos y enum de roles
│   └── .env.example             Variables del API (sin secretos reales)
├── Frontend/                    Next.js App Router
│   ├── app/(app)/               Rutas por rol: cargador, revisor,
│   │                            administrador, superadmin
│   ├── app/login/               Acceso
│   ├── app/api/                 BFF: /api/sesion y proxy /api/v1/*
│   └── .env.local.example       Variables del frontend
├── docs/
│   ├── contrato-api/            OpenAPI 3.0 y su guía
│   ├── pruebas/                 Newman, Postman, F-05 y k6
│   ├── despliegue.md            Supabase + Render + Vercel
│   ├── despliegue-docker.md     Servidor universitario
│   ├── manuales/                Manuales de usuario y técnico
│   ├── adr/                     Decisiones de arquitectura
│   └── sprint-reviews/          Notas de los sprints
├── Documentos/                  Acta, requisitos, arquitectura, Decreto 1330
├── FormatosGuia/                Plantillas G1–G4 de referencia
├── docker-compose.yml           PostgreSQL 16 local (puerto 5433)
├── docker-compose.prod.yml      API + web (sin Postgres)
├── render.yaml                  Blueprint de Render
├── MemoriaGlobal.md             Memoria transversal del proyecto
└── README.md                    Este archivo
```

## Documentación de la API

El contrato OpenAPI 3.0.0 está versionado en el repositorio y cubre **112 operaciones** (93 rutas) en `develop_v2` (commit de referencia de este README: `f6424eb`):

- Contrato: [`docs/contrato-api/openapi.json`](docs/contrato-api/openapi.json)
- Guía (roles, errores, paginación): [`docs/contrato-api/README.md`](docs/contrato-api/README.md)
- En GitHub: [docs/contrato-api/openapi.json](https://github.com/DeibyRamirez/SIAC/blob/develop_v2/docs/contrato-api/openapi.json)

La interfaz HTML de Swagger se genera con `@nestjs/swagger` (`Backend/src/openapi/documento-openapi.ts`) y se monta en `/api/docs` (fuera del prefijo `/api/v1`). El documento también se sirve en `/api/docs-json` y `/api/docs-yaml`.

| Entorno | Comportamiento |
|---------|----------------|
| Desarrollo / pruebas (`NODE_ENV` distinto de `production`) | `http://localhost:3001/api/docs`, sin autenticación. |
| Producción con `SWAGGER_HABILITADO=true`, `SWAGGER_USUARIO` y `SWAGGER_CLAVE` (≥ 12 caracteres) | `https://<backend>/api/docs`, protegido con HTTP Basic. Sin credenciales o con credenciales incorrectas responde `401`. |
| Producción sin `SWAGGER_HABILITADO=true`, o sin usuario o clave | No se monta (`404`). Si falta usuario o clave se registra un aviso `[configuración]` al arrancar. |

La comparación de credenciales es en tiempo constante (`Backend/src/openapi/acceso-swagger.ts`, con pruebas en `acceso-swagger.spec.ts`). Las credenciales se entregan por un canal aparte (sobre o gestor de contraseñas), nunca en el repositorio. En la interfaz, el botón **Authorize** acepta el JWT de `POST /api/v1/auth/login` para probar los endpoints protegidos.

Hay una prueba que compara, clave por clave, el documento generado desde el código con `openapi.json`: `Backend/src/openapi/contrato-openapi.spec.ts`.

Para regenerar el contrato y comprobar que sigue coincidiendo con el código:

```bash
cd Backend
ESCRIBIR_CONTRATO_OPENAPI=1 pnpm exec jest src/openapi/contrato-openapi.spec.ts --runInBand
pnpm exec jest src/openapi/contrato-openapi.spec.ts --runInBand
```

La primera orden escribe `docs/contrato-api/openapi.json`. La segunda solo verifica. No abre una base de datos (usa un Prisma falso).

Colección Postman / Newman, generada desde ese contrato:

```bash
node docs/pruebas/postman/generar-coleccion-desde-openapi.mjs
```

Artefactos: [`docs/pruebas/postman/SIAC-api-v1.postman_collection.json`](docs/pruebas/postman/SIAC-api-v1.postman_collection.json) y el entorno [`docs/pruebas/postman/siac-local.postman_environment.json`](docs/pruebas/postman/siac-local.postman_environment.json). Cómo ejecutar Newman solo contra localhost está en [`docs/pruebas/README.md`](docs/pruebas/README.md). No debe correrse contra Vercel ni Render.

Cobertura de la colección frente al contrato (verificada el 18 de noviembre de 2026): **108 de 112** operaciones. Las 4 que faltan llegaron con el PR #31 (vista previa y versión del revisor) y están listadas en [`COBERTURA-SWAGGER.md`](docs/pruebas/postman/COBERTURA-SWAGGER.md).

Autenticación de la API (salvo endpoints públicos y cifras institucionales):

```http
Authorization: Bearer <token>
```

El token lo entrega `POST /api/v1/auth/login` con `{ correo, contrasena }`. Las cifras institucionales usan la cabecera `x-api-key`.

## Requisitos locales

- Node.js 24 LTS (fijado en `engines.node` de Backend y Frontend)
- pnpm 10.x (`corepack enable`; el repo declara `pnpm@10.33.2`)
- PostgreSQL 16: con Docker (`docker compose up -d` en la raíz) o una instalación nativa
- Git

Las pruebas E2E y la verificación de migraciones de la CI de GitHub también usan PostgreSQL 16.

## Arranque local

### PostgreSQL (Docker)

Desde la raíz del monorepo:

```bash
docker compose up -d
docker exec siac-postgres pg_isready -U postgres -d siac
```

El contenedor se llama `siac-postgres` y publica PostgreSQL 16 en **localhost:5433** (para no chocar con un Postgres nativo en 5432). El compose usa autenticación `trust`. Las cadenas de ejemplo del repositorio son:

```text
postgresql://postgres:postgres@localhost:5433/siac
```

### Backend (`/api/v1`)

```bash
cd Backend
cp .env.example .env
```

Ajuste al menos estas variables (valores de ejemplo, sin secretos de producción):

```env
NODE_ENV="development"
PUERTO=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/siac"
DIRECT_URL="postgresql://postgres:postgres@localhost:5433/siac"
JWT_SECRETO="CHANGE_ME_JWT_SECRET"
JWT_EXPIRACION="8h"
DOMINIO_INSTITUCIONAL="uniautonoma.edu.co"
CORS_ORIGENES="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
S3_USAR_ALMACEN_LOCAL="true"
ALMACEN_LOCAL_RUTA="./almacen-local"
CORREO_CANAL="ninguno"
```

Si prefiere usar Supabase Storage también en local, ponga `S3_USAR_ALMACEN_LOCAL="false"` y complete `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` y los nombres de bucket. No escriba claves reales en el repositorio.

Luego:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:deploy
pnpm prisma:seed
pnpm start:dev
```

- `pnpm prisma:deploy` aplica las migraciones (incluyen el catálogo de trámites G1–G4 y la institución).
- `pnpm prisma:seed` solo asegura la fila `ConfiguracionSIAC`; no crea usuarios, programas, evidencias ni plantillas de ejemplo.
- El API queda en `http://localhost:3001/api/v1`. Salud: `http://localhost:3001/api/v1/salud`. Swagger (sin autenticación fuera de production): `http://localhost:3001/api/docs`.

`pnpm prisma:setup` (migraciones + verificación + semilla + backfill en un solo paso) es **solo para una base local**: aborta si `DATABASE_URL` o `DIRECT_URL` apuntan a un host que no sea `localhost`, `127.0.0.1` o el servicio `postgres` de CI. Para un caso excepcional y deliberado contra una base remota hay que declarar `SIAC_PERMITIR_SETUP_REMOTO=true` en la terminal. Render no usa este script: aplica las migraciones con `start:despliegue`.

#### Primer SuperAdmin

La base arranca sin usuarios. El primer SuperAdmin se crea una sola vez, con variables en la terminal (no en un archivo versionado). La clave debe tener al menos 12 caracteres y el correo debe ser del dominio institucional. El comando aborta si ya hay usuarios.

```bash
cd Backend
PRIMER_ADMIN_NOMBRE="Nombre Apellido" \
PRIMER_ADMIN_CORREO="correo@uniautonoma.edu.co" \
PRIMER_ADMIN_CLAVE="clave-de-al-menos-12" \
pnpm prisma:primer-admin
```

En PowerShell el equivalente está en [`docs/despliegue.md`](docs/despliegue.md). Con esa sesión se crean los demás roles, se asignan programas (o se sincronizan por CSV) y se suben las plantillas desde la biblioteca.

Si el arranque con `pnpm start:dev` resulta lento en la terminal, se puede compilar y ejecutar el build:

```bash
pnpm build
pnpm start:prod
```

(`start:prod` equivale a `node dist/src/main.js`.)

### Frontend

```bash
cd Frontend
cp .env.local.example .env.local
```

Variables clave:

```env
API_URL_INTERNAL=http://localhost:3001/api/v1
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
POWERBI_MODO=publico
```

`API_URL_INTERNAL` es la que usa el BFF en el servidor de Next.js. En producción (Vercel) es obligatoria y debe apuntar a la URL pública del API, por ejemplo `https://siac-backend-tad8.onrender.com/api/v1`. Si falta, el BFF de producción no llama a localhost: falla con un error explícito.

```bash
pnpm install
pnpm dev
```

La aplicación queda en `http://localhost:3000`. El login es `http://localhost:3000/login`.

## Pruebas y CI/CD

| Área | Cómo se ejecuta | Qué cubre |
|------|-----------------|-----------|
| Backend (unitarias) | `cd Backend && pnpm test` | Jest. Incluye la prueba de coincidencia del contrato OpenAPI. |
| Backend (E2E) | `cd Backend && pnpm test:e2e` | Jest + supertest, contra PostgreSQL. En CI la API corre con el rol `siac_app` (RLS aplicada). |
| Frontend | `cd Frontend && pnpm test` | Vitest. |
| Cobertura | `pnpm test:cov` en Backend o Frontend | Jest / Vitest. |
| Newman | `./docs/pruebas/ejecutar-newman.sh` | Colección Postman solo contra localhost o el Postgres efímero de CI. |
| k6 (opcional) | `K6_BASE_URL=http://localhost:3001/api/v1 k6 run docs/pruebas/k6/carga-api-local.js` | Carga básica local. No ejecutar contra producción. |

La CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) corre en push y pull request hacia `develop`, `develop_v2` y `main`. Incluye:

- typcheck, migraciones, `jest`, E2E y build del backend
- Newman (colección `/api/v1`)
- typcheck, Vitest y build del frontend
- construcción de las imágenes Docker y una prueba de humo de `/api/v1/salud` y del frontend

La CD ([`.github/workflows/cd.yml`](.github/workflows/cd.yml)) se dispara en push a `main` (o a mano). Construye artefactos e imágenes y, si están configurados los secretos, puede disparar el deploy del backend en Render (`RENDER_DEPLOY_HOOK_URL`) y el del frontend en Vercel (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). Si esos secretos no están, el workflow lo indica y no despliega.

## Ramas

- `develop_v2` — rama de integración vigente. Este README describe el código de esa rama. La CI corre en cada push y pull request.
- `main` — recibe pull requests desde `develop_v2`. El workflow de CD está configurado para ejecutarse al hacer push a `main`.
- `feature/HU-XXX-descripcion` o `feature/S3-...` — una rama por historia o tarea; el pull request va hacia `develop_v2`.
- `develop` y `develop_v3` son ramas antiguas: no se usan para trabajo nuevo.

La CI también escucha `develop` por compatibilidad con esa configuración.

## Documentación del repositorio

| Documento | Contenido |
|-----------|-----------|
| [docs/despliegue.md](docs/despliegue.md) | Orden de despliegue en Supabase, Render y Vercel, variables y pruebas de humo |
| [docs/despliegue-docker.md](docs/despliegue-docker.md) | Orquestación en un servidor universitario |
| [docs/contrato-api/README.md](docs/contrato-api/README.md) | Contrato OpenAPI, roles, errores y paginación |
| [docs/pruebas/README.md](docs/pruebas/README.md) | Jest, Newman, k6 y reportes |
| [docs/manuales/](docs/manuales/) | Manual de usuario y manual técnico |
| [docs/powerbi-conexion-cifras.md](docs/powerbi-conexion-cifras.md) | Conexión de Power BI a las cifras |
| [docs/powerbi-insercion-azure.md](docs/powerbi-insercion-azure.md) | Inserción con entidad de servicio Azure (opcional) |
| [docs/adr/](docs/adr/) | Decisiones de arquitectura |
| [docs/sprint-reviews/](docs/sprint-reviews/) | Revisiones de sprint |
| [MemoriaGlobal.md](MemoriaGlobal.md) | Memoria transversal |
| [Frontend/MEMORIA_PROYECTO.md](Frontend/MEMORIA_PROYECTO.md) | Memoria del frontend |
| [Documentos/estructura_decreto_etapas_documentos.md](Documentos/estructura_decreto_etapas_documentos.md) | Decreto 1330 de 2019 y su relación con SIAC |
| [Documentos/](Documentos/) | Acta, propuesta, requisitos y arquitectura (F-00 a F-03) |

## Autores

- Deiby Alejandro Ramirez Galvis
- David Urrutia Ceron
