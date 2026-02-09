#!/bin/sh
set -eu

DIST_ROOT="/app/apps/api/dist"
ALT_DIST_ROOT="/app/apps/api/dist/apps/api/src"

ensure_common_encryption() {
  if [ -f "${DIST_ROOT}/common/encryption.js" ]; then
    return 0
  fi

  if [ -f "${ALT_DIST_ROOT}/common/encryption.js" ]; then
    echo "[api-entrypoint] dist/common/encryption.js missing; copying from alternate dist path"
    mkdir -p "${DIST_ROOT}/common"
    cp "${ALT_DIST_ROOT}/common/encryption.js" "${DIST_ROOT}/common/encryption.js"
    [ -f "${ALT_DIST_ROOT}/common/encryption.js.map" ] && cp "${ALT_DIST_ROOT}/common/encryption.js.map" "${DIST_ROOT}/common/encryption.js.map" || true
    [ -f "${ALT_DIST_ROOT}/common/encryption.d.ts" ] && cp "${ALT_DIST_ROOT}/common/encryption.d.ts" "${DIST_ROOT}/common/encryption.d.ts" || true
    return 0
  fi

  echo "[api-entrypoint] ERROR: encryption module not found in dist paths"
  echo "[api-entrypoint] Checked: ${DIST_ROOT}/common/encryption.js and ${ALT_DIST_ROOT}/common/encryption.js"
  return 1
}

pick_main() {
  if [ -f "${DIST_ROOT}/main.js" ]; then
    echo "${DIST_ROOT}/main.js"
    return 0
  fi

  if [ -f "${ALT_DIST_ROOT}/main.js" ]; then
    echo "${ALT_DIST_ROOT}/main.js"
    return 0
  fi

  echo ""
  return 1
}

ensure_common_encryption

MAIN_FILE="$(pick_main || true)"
if [ -z "${MAIN_FILE}" ]; then
  echo "[api-entrypoint] ERROR: Could not find main.js in dist"
  echo "[api-entrypoint] Checked: ${DIST_ROOT}/main.js and ${ALT_DIST_ROOT}/main.js"
  exit 1
fi

echo "[api-entrypoint] Starting API with ${MAIN_FILE}"
exec node "${MAIN_FILE}"

