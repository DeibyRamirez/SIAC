#!/usr/bin/env bash
# Rechaza URLs que no sean localhost/CI (nunca Supabase ni producción).
set -euo pipefail
BASE="${NEWMAN_BASE_URL:-http://localhost:3001/api/v1}"
HOST=$(node -e "try{console.log(new URL(process.argv[1]).hostname)}catch{process.exit(2)}" "$BASE")
case "$HOST" in
  localhost|127.0.0.1|0.0.0.0) ;;
  *)
    echo "[newman] Destino no permitido: $HOST (solo localhost/127.0.0.1)" >&2
    exit 1
    ;;
esac
DB_URL="${DATABASE_URL:-}"
DB_HOST=$(node -e "try{console.log(new URL(process.argv[1]).hostname)}catch{console.log('')}" "$DB_URL" 2>/dev/null || true)
if [[ -n "$DB_HOST" ]]; then
  case "$DB_HOST" in
    localhost|127.0.0.1|postgres) ;;
    *)
      echo "[newman] DATABASE_URL no es desechable (host=$DB_HOST)" >&2
      exit 1
      ;;
  esac
fi
if [[ "$BASE" == *supabase* ]] || [[ "$BASE" == *vercel.app* ]] || [[ "$BASE" == *render.com* ]]; then
  echo "[newman] URL de producción/staging explícita bloqueada." >&2
  exit 1
fi
echo "[newman] Destino OK: $HOST"
