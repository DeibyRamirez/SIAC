# Manual Técnico — SIAC

## Arquitectura

- **Frontend:** Next.js 16 App Router, React 19, Tailwind 4
- **Backend:** NestJS 10 monolito en capas
- **BD:** PostgreSQL 14 + Prisma ORM
- **Storage:** S3 compatible (local dev / MinIO prod)
- **Auth:** JWT + Passport.js

## Patrones

| Patrón | Ubicación |
|--------|-----------|
| Repository | `*.repositorio.ts` |
| DTO | `dto/*.dto.ts` |
| Adapter/Gateway | APIs externas (futuro) |
| DI | NestJS providers |
| Guards | `common/guards/` |

## Variables de entorno

Ver `Backend/.env.example` y `Frontend/.env.local.example`.

## Comandos

```bash
# Backend
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
pnpm test

# Frontend
cd Frontend
pnpm install
pnpm dev
pnpm run build
```

## API Base

`http://localhost:3001/api`

Autenticación: header `Authorization: Bearer <token>`

## Migración producción

1. `pg_dump` desde Supabase
2. Restaurar en PostgreSQL institucional
3. Cambiar `DATABASE_URL` y credenciales S3/MinIO
4. Sin reescribir lógica de negocio

## CI/CD

GitHub Actions ejecuta build frontend y tests backend en cada push.
