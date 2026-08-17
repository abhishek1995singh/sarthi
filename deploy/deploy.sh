#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$ROOT/deploy"
ENV_FILE="$DEPLOY_DIR/.env"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/.env.example to deploy/.env and edit it."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

compose_up() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans
  echo ""
  echo "Stack is up. Open: ${PUBLIC_URL:-http://localhost}"
  echo "Health:   ${PUBLIC_URL:-http://localhost}/api/actuator/health"
  echo "Login:    admin / Admin@123  (change after first login)"
}

if [[ -n "${DEPLOY_HOST:-}" ]]; then
  REMOTE_PATH="${DEPLOY_PATH:-/opt/sarthi}"
  echo "Deploying to ${DEPLOY_HOST}:${REMOTE_PATH} ..."
  ssh "$DEPLOY_HOST" "mkdir -p '$REMOTE_PATH'"
  rsync -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'frontend/dist' \
    --exclude 'frontend/.angular' \
    --exclude 'backend/target' \
    --exclude 'backend/data' \
    --exclude 'e2e/test-results' \
    "$ROOT/" "${DEPLOY_HOST}:${REMOTE_PATH}/"
  scp "$ENV_FILE" "${DEPLOY_HOST}:${REMOTE_PATH}/deploy/.env"
  ssh "$DEPLOY_HOST" "cd '$REMOTE_PATH' && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build --remove-orphans"
  echo ""
  echo "Remote deploy complete. Open: ${PUBLIC_URL}"
else
  compose_up
fi
