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
pnpm prisma:deploy
pnpm prisma:seed      # solo usuarios (uno por rol); sin programas ni datos de ejemplo
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

## Scripts de datos (se ejecutan a mano, nunca como migración)

### Limpieza de anexos de vigencia sin documento

Decisión del PO (06/10): las filas de `AnexoVigencia` sin documento archivado (`rutaArchivo` nulo o vacío, p. ej. los antiguos `anx-seed-001/002`) se borran con un script explícito e idempotente, no con una migración de Prisma.

```bash
cd Backend
# 1) Simulación: exporta las filas a Backend/respaldos/*.json y *.csv y las cuenta; no borra nada
pnpm datos:limpiar-anexos-sin-documento
# 2) Borrado: vuelve a respaldar, borra y muestra «Anexos borrados: N» y «restantes: 0»
pnpm datos:limpiar-anexos-sin-documento -- --ejecutar
# Verificación
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "AnexoVigencia" WHERE "rutaArchivo" IS NULL OR "rutaArchivo" = '"''"';'
```

- Solo corre contra `localhost`, `127.0.0.1` o `postgres`. Para otra BD (staging o producción) hay que añadir `--permitir-bd-remota`, con la aprobación del PO y un `pg_dump` previo.
- `--salida=<carpeta>` cambia la carpeta del respaldo. `Backend/respaldos/` está en `.gitignore`: los respaldos nunca se versionan.
- Es idempotente: una segunda ejecución informa 0 filas y no crea respaldo.

## CI/CD

GitHub Actions ejecuta build frontend y tests backend en cada push.
