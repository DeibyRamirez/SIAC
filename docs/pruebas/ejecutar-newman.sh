#!/usr/bin/env bash
# Ejecuta Newman contra API local/CI con BD desechable. Nunca usar Supabase/producción.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
COL="$ROOT/postman/SIAC-api-v1.postman_collection.json"
ENV="$ROOT/postman/siac-local.postman_environment.json"
OUT="$ROOT"
HTML="$ROOT/reporte-newman.html"
JSON="$ROOT/reporte-newman.json"

chmod +x "$ROOT/verificar-destino-newman.sh"
export NEWMAN_BASE_URL="${NEWMAN_BASE_URL:-http://localhost:3001/api/v1}"
"$ROOT/verificar-destino-newman.sh"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5433/siac}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export JWT_SECRETO="${JWT_SECRETO:-local-newman-not-production}"
export S3_USAR_ALMACEN_LOCAL=true
export CARRERAS_SYNC_HABILITADO=false
export CORREO_CANAL=ninguno
export NODE_ENV=development

if [[ -z "${NEWMAN_CLAVE_PRUEBA:-}" ]]; then
  echo "Defina NEWMAN_CLAVE_PRUEBA (mín. 12 caracteres) en la terminal — no se guarda en el repo." >&2
  exit 1
fi

cd "$REPO/Backend"
if ! curl -sf "${NEWMAN_BASE_URL%/}/salud" >/dev/null; then
  echo "La API debe estar en marcha (pnpm build && pnpm start:prod tras migrate + usuarios)." >&2
  exit 1
fi

npx --yes -p newman@6.2.1 -p newman-reporter-htmlextra@1.23.1 newman run "$COL" -e "$ENV" \
  --env-var "clavePrueba=${NEWMAN_CLAVE_PRUEBA}" \
  --delay-request 25 \
  --timeout-request 30000 \
  --reporters cli,json,htmlextra \
  --reporter-json-export "$JSON" \
  --reporter-htmlextra-export "$HTML" \
  --reporter-htmlextra-title "SIAC Newman F-05" \
  --reporter-htmlextra-darkTheme \
  --color on

node "$ROOT/sanitizar-reporte-newman.mjs" "$JSON" "$HTML"

mkdir -p /opt/cursor/artifacts
cp -f "$JSON" /opt/cursor/artifacts/reporte-newman.json
cp -f "$HTML" /opt/cursor/artifacts/reporte-newman.html

echo "Reportes: $JSON , $HTML"
