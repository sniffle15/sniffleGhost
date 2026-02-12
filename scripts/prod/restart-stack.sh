#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f ".env.production" ]]; then
  echo "Missing .env.production in ${ROOT_DIR}"
  exit 1
fi

PROD_COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)

echo "[prod-restart] Stopping accidental local compose stack (if running)..."
docker compose down --remove-orphans >/dev/null 2>&1 || true

echo "[prod-restart] Stopping production stack..."
"${PROD_COMPOSE[@]}" down --remove-orphans || true

echo "[prod-restart] Building and starting production stack..."
"${PROD_COMPOSE[@]}" up -d --build

echo "[prod-restart] Running containers:"
"${PROD_COMPOSE[@]}" ps

