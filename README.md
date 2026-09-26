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
pnpm prisma migrate deploy
pnpm prisma:seed
pnpm start:dev
```

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

## Sprint 1 (Fundación técnica)

Historias: HU-001, HU-002, HU-003 (inicio), HU-011.

Documentación: [`docs/etapa-1/README.md`](docs/etapa-1/README.md)
