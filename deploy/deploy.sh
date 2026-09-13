#!/usr/bin/env bash
# Production deploy: dump Postgres, copy code, rebuild the stack.
# Usage:
#   ./deploy/deploy.sh              Backup, then deploy (uses deploy/.env.vps when present)
#   ./deploy/deploy.sh backup       Backup only
#   ./deploy/deploy.sh restore      Restore the latest dump
#   ./deploy/deploy.sh restore FILE Restore a specific dump (.sql.gz)
#   ./deploy/deploy.sh reset        Backup, then WIPE all data (drops the Postgres volume,
#                                   re-runs migrations from empty — admin login + seed
#                                   commodities only, no parties/purchases/sales/cash entries)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$ROOT/deploy"
BACKUP_SCRIPT="$DEPLOY_DIR/postgres-backup.sh"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
REMOTE_BACKUP_DIR="/var/backups/sarthi"
LOCAL_BACKUP_DIR="$DEPLOY_DIR/backups"

if [[ -n "${SARTHI_ENV_FILE:-}" ]]; then
  ENV_FILE="$SARTHI_ENV_FILE"
elif [[ -f "$DEPLOY_DIR/.env.vps" ]]; then
  ENV_FILE="$DEPLOY_DIR/.env.vps"
else
  ENV_FILE="$DEPLOY_DIR/.env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/.env.example to deploy/.env and edit it."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

RSYNC_EXCLUDES=(
  --exclude '.git'
  --exclude 'node_modules'
  --exclude 'frontend/dist'
  --exclude 'frontend/.angular'
  --exclude 'backend/target'
  --exclude 'backend/data'
  --exclude 'e2e/test-results'
  --exclude 'e2e/node_modules'
  --exclude '.env'
  --exclude '.env.*'
  --exclude 'deploy/backups'
  --exclude '.cursor'
)

usage() {
  cat <<EOF
Usage:
  $0              Backup Postgres, then deploy
  $0 backup       Backup only
  $0 restore      Restore the latest dump on the target
  $0 restore FILE Restore a specific .sql.gz dump
  $0 reset        Backup, then wipe all data and redeploy from a clean DB

Env file: $ENV_FILE
Override with SARTHI_ENV_FILE=/path/to/env $0
EOF
}

pull_dump_locally() {
  local remote_file="$1"
  [[ -n "$remote_file" ]] || return 0
  mkdir -p "$LOCAL_BACKUP_DIR"
  local name
  name="$(basename "$remote_file")"
  scp "${DEPLOY_HOST}:${remote_file}" "$LOCAL_BACKUP_DIR/$name"
  echo "Local copy: $LOCAL_BACKUP_DIR/$name"
}

remote_backup() {
  local REMOTE_PATH="${DEPLOY_PATH:-/opt/sarthi}"
  ssh "$DEPLOY_HOST" "mkdir -p '$REMOTE_PATH/deploy' '$REMOTE_BACKUP_DIR'"
  scp "$BACKUP_SCRIPT" "${DEPLOY_HOST}:${REMOTE_PATH}/deploy/postgres-backup.sh"
  ssh "$DEPLOY_HOST" "chmod +x '${REMOTE_PATH}/deploy/postgres-backup.sh'"

  local output remote_file
  output="$(ssh "$DEPLOY_HOST" \
    "BACKUP_DIR='$REMOTE_BACKUP_DIR' BACKUP_KEEP='${BACKUP_KEEP:-10}' \
     POSTGRES_DB='${POSTGRES_DB:-sarthi_preprod}' POSTGRES_USER='${POSTGRES_USER:-sarthi}' \
     bash '${REMOTE_PATH}/deploy/postgres-backup.sh' backup")"
  echo "$output"
  remote_file="$(echo "$output" | awk '/^Backup written:/{print $3}')"
  if [[ -n "$remote_file" ]]; then
    pull_dump_locally "$remote_file"
  fi
}

local_backup() {
  mkdir -p "$LOCAL_BACKUP_DIR"
  BACKUP_DIR="$LOCAL_BACKUP_DIR" \
    BACKUP_KEEP="${BACKUP_KEEP:-10}" \
    ENV_FILE="$ENV_FILE" \
    bash "$BACKUP_SCRIPT" backup
}

run_backup() {
  echo "Using env: $ENV_FILE"
  if [[ -n "${DEPLOY_HOST:-}" ]]; then
    echo "Backing up Postgres on ${DEPLOY_HOST} ..."
    remote_backup
  else
    echo "Backing up local Postgres ..."
    local_backup
  fi
}

compose_up() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans
  echo ""
  echo "Stack is up. Open: ${PUBLIC_URL:-http://localhost}"
  echo "Health:   ${PUBLIC_URL:-http://localhost}/api/actuator/health"
}

deploy_remote() {
  local REMOTE_PATH="${DEPLOY_PATH:-/opt/sarthi}"
  echo "Deploying to ${DEPLOY_HOST}:${REMOTE_PATH} ..."
  ssh "$DEPLOY_HOST" "mkdir -p '$REMOTE_PATH'"
  rsync -az --delete "${RSYNC_EXCLUDES[@]}" "$ROOT/" "${DEPLOY_HOST}:${REMOTE_PATH}/"
  scp "$ENV_FILE" "${DEPLOY_HOST}:${REMOTE_PATH}/deploy/.env"
  ssh "$DEPLOY_HOST" "chmod +x '${REMOTE_PATH}/deploy/postgres-backup.sh' '${REMOTE_PATH}/deploy/deploy.sh'"
  ssh "$DEPLOY_HOST" "cd '$REMOTE_PATH' && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build --remove-orphans"
  echo ""
  echo "Remote deploy complete. Open: ${PUBLIC_URL}"
}

restore_remote() {
  local file="${1:-latest}"
  local REMOTE_PATH="${DEPLOY_PATH:-/opt/sarthi}"
  local remote_file="$file"

  ssh "$DEPLOY_HOST" "mkdir -p '$REMOTE_PATH/deploy' '$REMOTE_BACKUP_DIR'"
  scp "$BACKUP_SCRIPT" "${DEPLOY_HOST}:${REMOTE_PATH}/deploy/postgres-backup.sh"

  if [[ "$file" != "latest" ]]; then
    if [[ "$file" == /var/backups/sarthi/* ]]; then
      remote_file="$file"
    elif [[ -f "$file" ]]; then
      remote_file="$REMOTE_BACKUP_DIR/$(basename "$file")"
      scp "$file" "${DEPLOY_HOST}:${remote_file}"
    else
      echo "Backup file not found: $file" >&2
      exit 1
    fi
  fi

  echo "Restoring Postgres on ${DEPLOY_HOST} ..."
  ssh "$DEPLOY_HOST" \
    "BACKUP_DIR='$REMOTE_BACKUP_DIR' \
     POSTGRES_DB='${POSTGRES_DB:-sarthi_preprod}' POSTGRES_USER='${POSTGRES_USER:-sarthi}' \
     bash '${REMOTE_PATH}/deploy/postgres-backup.sh' restore '$remote_file'"
}

restore_local() {
  local file="${1:-latest}"
  BACKUP_DIR="$LOCAL_BACKUP_DIR" \
    ENV_FILE="$ENV_FILE" \
    bash "$BACKUP_SCRIPT" restore "$file"
}

run_restore() {
  echo "Using env: $ENV_FILE"
  if [[ -n "${DEPLOY_HOST:-}" ]]; then
    restore_remote "${1:-latest}"
  else
    restore_local "${1:-latest}"
  fi
}

reset_remote() {
  local REMOTE_PATH="${DEPLOY_PATH:-/opt/sarthi}"
  local project_name
  project_name="$(basename "$DEPLOY_DIR")"
  local volume="${project_name}_sarthi_pgdata"

  echo "Stopping stack and dropping Postgres volume ($volume) on ${DEPLOY_HOST} ..."
  ssh "$DEPLOY_HOST" "cd '$REMOTE_PATH' && docker compose -f deploy/docker-compose.yml --env-file deploy/.env down"
  ssh "$DEPLOY_HOST" "docker volume rm '$volume'"
  echo "Volume removed. Recreating stack from a clean database ..."
  ssh "$DEPLOY_HOST" "cd '$REMOTE_PATH' && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build --remove-orphans"
  echo ""
  echo "Reset complete. Fresh DB has only the seed data (admin login, default commodities)."
  echo "Open: ${PUBLIC_URL}"
}

reset_local() {
  local volume="deploy_sarthi_pgdata"
  echo "Stopping stack and dropping local Postgres volume ($volume) ..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  docker volume rm "$volume"
  echo "Volume removed. Recreating stack from a clean database ..."
  compose_up
}

run_reset() {
  echo "Using env: $ENV_FILE"
  echo "This backs up first, then PERMANENTLY deletes all parties/purchases/sales/cash/ledger data."
  run_backup
  if [[ -n "${DEPLOY_HOST:-}" ]]; then
    reset_remote
  else
    reset_local
  fi
}

cmd="${1:-deploy}"
case "$cmd" in
  -h|--help|help)
    usage
    ;;
  backup)
    run_backup
    ;;
  restore)
    run_restore "${2:-latest}"
    ;;
  reset)
    run_reset
    ;;
  deploy)
    run_backup
    if [[ -n "${DEPLOY_HOST:-}" ]]; then
      deploy_remote
    else
      compose_up
    fi
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
