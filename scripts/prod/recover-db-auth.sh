#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f ".env.production" ]]; then
  echo "Missing .env.production in ${ROOT_DIR}"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source ".env.production"
set +a

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required variable in .env.production: ${name}"
    exit 1
  fi
}

require_var POSTGRES_USER
require_var POSTGRES_PASSWORD
require_var POSTGRES_DB

if [[ ! "${POSTGRES_USER}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "POSTGRES_USER contains unsupported characters. Use letters, numbers, underscore."
  exit 1
fi

if [[ ! "${POSTGRES_DB}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "POSTGRES_DB contains unsupported characters. Use letters, numbers, underscore."
  exit 1
fi

escape_sql_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

POSTGRES_PASSWORD_SQL="$(escape_sql_literal "${POSTGRES_PASSWORD}")"
COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)

echo "[recover-db-auth] Starting postgres container..."
"${COMPOSE[@]}" up -d postgres

echo "[recover-db-auth] Ensuring role password matches .env.production..."
cat <<SQL | "${COMPOSE[@]}" exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    ALTER ROLE "${POSTGRES_USER}" WITH LOGIN PASSWORD '${POSTGRES_PASSWORD_SQL}';
  ELSE
    CREATE ROLE "${POSTGRES_USER}" WITH LOGIN PASSWORD '${POSTGRES_PASSWORD_SQL}';
  END IF;
END
\$\$;
SQL

echo "[recover-db-auth] Ensuring database exists..."
DB_EXISTS="$("${COMPOSE[@]}" exec -T postgres psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'")"
if [[ "${DB_EXISTS}" != "1" ]]; then
  "${COMPOSE[@]}" exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"
fi

echo "[recover-db-auth] Granting privileges..."
"${COMPOSE[@]}" exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE \"${POSTGRES_DB}\" TO \"${POSTGRES_USER}\";"

echo "[recover-db-auth] Done."
echo "[recover-db-auth] Next: docker compose --env-file .env.production -f docker-compose.prod.yml up -d api web runner"
