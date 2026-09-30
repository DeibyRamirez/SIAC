# SIAC — Sistema Interno de Aseguramiento de la Calidad

Monorepo del proyecto académico CUAC (Frontend Next.js + Backend NestJS).

## Requisitos

- Node.js 20 LTS
- pnpm 10.x (`corepack enable`)

## Arranque local

### Backend (API `/api/v1`)

```bash
cd Backend
cp .env.example .env
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
node dist/main.js
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
