# SIAC — Sistema Interno de Aseguramiento de la Calidad

Monorepo del proyecto académico CUAC (Frontend Next.js + Backend NestJS).

## Requisitos

- Node.js 20 LTS
- pnpm 10.x (`corepack enable`)
- Docker Desktop (PostgreSQL local)

## Arranque local

### PostgreSQL (Docker)

Desde la raíz del monorepo:

```bash
docker compose up -d
docker exec siac-postgres pg_isready -U postgres -d siac
```

El contenedor expone PostgreSQL 16 en **localhost:5433** (puerto 5433 evita conflicto con un Postgres nativo en 5432). Credenciales: usuario `postgres`, contraseña `postgres`, base `siac`.

### Backend (API `/api/v1`)

```bash
cd Backend
cp .env.example .env
```

En `.env`, apunte la base de datos al Postgres local (Storage puede seguir en Supabase):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/siac"
DIRECT_URL="postgresql://postgres:postgres@localhost:5433/siac"
S3_USAR_ALMACEN_LOCAL="false"
# Completar S3_ENDPOINT, S3_ACCESS_KEY y S3_SECRET_KEY con Supabase Storage
```

Luego:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:deploy   # migraciones (incluyen catálogo de trámites G1–G4 e institución CUAC)
pnpm prisma:seed     # solo 5 usuarios, uno por rol
pnpm start:dev
```

La base arranca sin programas, evidencias, plantillas ni vigencias de ejemplo. Tras iniciar sesión
como Administrador (`admin.planeacion@uniautonoma.edu.co` / `Admin2026`) se crean los programas
(o se sincronizan por CSV) y se suben las plantillas `.docx` desde la Biblioteca de plantillas;
quedan en el bucket `plantillas` de Supabase Storage y se descargan desde ahí.

## Si la terminal va lenta, ejecute esto antes de `pnpm start:dev`:

```bash
pnpm build
node dist/src/main.js
```

Swagger: `http://localhost:3001/api/docs`

### Frontend

```bash
cd Frontend
cp .env.local.example .env.local
pnpm install
pnpm build
pnpm dev
```

App: `http://localhost:3000`

## Estrategia de ramas

- `main` — código estable desplegado
- `develop` — integración de incrementos
- `feature/HU-XXX-descripcion` — una rama por historia; PR hacia `develop`

## Sprints

El estado oficial vive en ClickUp; este repositorio no declara sprints completados.

| Sprint | Estado | Historias |
|--------|--------|-----------|
| 1 | Completada, con el alcance por programa cerrado al iniciar el Sprint 2 | HU-001, HU-002, HU-011, inicio HU-003 |
| 2 | En progreso | HU-003, HU-004, HU-005, HU-008, HU-010 |
| 3 | Por hacer | HU-006, HU-007, HU-009 |
| 4 | Por hacer | Aceptación HU-001..HU-011 |

Documentación del Sprint 1: [`docs/etapa-1/README.md`](docs/etapa-1/README.md). Repositorio: `https://github.com/DeibyRamirez/SIAC`.
