#!/usr/bin/env bash
# Ejecuta Newman contra la API local (requiere PostgreSQL + migraciones + semilla + backend en :3001).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
COL="$ROOT/postman/SIAC-principal.postman_collection.json"
ENV="$ROOT/postman/siac-local.postman_environment.json"
OUT="$ROOT/newman"
mkdir -p "$OUT"
cd "$REPO/Backend"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5433/siac}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export JWT_SECRETO="${JWT_SECRETO:-local-newman-not-production}"
export S3_USAR_ALMACEN_LOCAL=true
export CARRERAS_SYNC_HABILITADO=false
if ! curl -sf "http://localhost:3001/api/v1/salud" >/dev/null; then
  echo "Inicie la API (pnpm start:dev en Backend) tras prisma migrate deploy y prisma:seed." >&2
  exit 1
fi
npx --yes newman@6.2.1 run "$COL" -e "$ENV" \
  --reporters cli,json \
  --reporter-json-export "$OUT/newman-report.json" \
  --color on
echo "Reporte: $OUT/newman-report.json"
