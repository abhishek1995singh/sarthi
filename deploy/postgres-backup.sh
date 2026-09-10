#!/usr/bin/env bash
# Dump or restore the Sarthi Postgres database. Safe to run on the VPS or locally.
# Usage:
#   ./postgres-backup.sh backup
#   ./postgres-backup.sh restore latest
#   ./postgres-backup.sh restore /var/backups/sarthi/sarthi-YYYYMMDDThhmmssZ.sql.gz
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER="${SARTHI_PG_CONTAINER:-sarthi-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sarthi}"
BACKUP_KEEP="${BACKUP_KEEP:-10}"

load_db_settings() {
  if [[ -n "${POSTGRES_DB:-}" && -n "${POSTGRES_USER:-}" ]]; then
    return 0
  fi
  local env_file="${ENV_FILE:-$SCRIPT_DIR/.env}"
  if [[ ! -f "$env_file" && -f /opt/sarthi/deploy/.env ]]; then
    env_file=/opt/sarthi/deploy/.env
  fi
  if [[ ! -f "$env_file" ]]; then
    echo "Missing database settings. Set POSTGRES_DB and POSTGRES_USER, or provide $env_file." >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$env_file"
  : "${POSTGRES_DB:?POSTGRES_DB is not set}"
  : "${POSTGRES_USER:?POSTGRES_USER is not set}"
}

container_running() {
  docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"
}

prune_old_backups() {
  local i=0 f
  while IFS= read -r f; do
    i=$((i + 1))
    if (( i > BACKUP_KEEP )); then
      rm -f "$f"
    fi
  done < <(ls -1t "$BACKUP_DIR"/sarthi-*.sql.gz 2>/dev/null || true)
}

cmd_backup() {
  load_db_settings
  mkdir -p "$BACKUP_DIR"

  if ! container_running; then
    echo "Postgres container '$CONTAINER' is not running — skipping backup (first deploy or stack is down)."
    return 0
  fi

  docker exec "$CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null

  local stamp tmp out size
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  tmp="$BACKUP_DIR/.tmp-${stamp}.sql.gz"
  out="$BACKUP_DIR/sarthi-${stamp}.sql.gz"

  docker exec "$CONTAINER" pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip -9 > "$tmp"

  gzip -t "$tmp"
  size="$(wc -c < "$tmp" | tr -d ' ')"
  if [[ "$size" -lt 200 ]]; then
    rm -f "$tmp"
    echo "Backup aborted: dump was only ${size} bytes." >&2
    exit 1
  fi

  mv "$tmp" "$out"
  prune_old_backups
  echo "Backup written: $out (${size} bytes)"
}

latest_backup() {
  ls -1t "$BACKUP_DIR"/sarthi-*.sql.gz 2>/dev/null | head -1
}

cmd_restore() {
  load_db_settings
  local file="${1:-}"
  if [[ -z "$file" || "$file" == "latest" ]]; then
    file="$(latest_backup || true)"
  fi
  if [[ -z "$file" || ! -f "$file" ]]; then
    echo "No backup file to restore. Usage: $0 restore latest|FILE" >&2
    exit 1
  fi
  gzip -t "$file"

  if ! container_running; then
    echo "Postgres container '$CONTAINER' is not running." >&2
    exit 1
  fi

  echo "Restoring $file into $POSTGRES_DB ..."
  local api_was_running=0
  if docker ps --format '{{.Names}}' | grep -qx sarthi-api; then
    api_was_running=1
    docker stop sarthi-api >/dev/null
  fi

  local restore_ok=0
  if gunzip -c "$file" | docker exec -i "$CONTAINER" \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 >/dev/null; then
    restore_ok=1
  fi

  if [[ "$api_was_running" -eq 1 ]]; then
    docker start sarthi-api >/dev/null || true
  fi

  if [[ "$restore_ok" -ne 1 ]]; then
    echo "Restore failed: $file" >&2
    exit 1
  fi
  echo "Restore complete: $file"
}

usage() {
  cat <<EOF
Usage:
  $0 backup
  $0 restore latest
  $0 restore FILE.sql.gz
EOF
}

case "${1:-}" in
  backup) cmd_backup ;;
  restore) cmd_restore "${2:-latest}" ;;
  *) usage >&2; exit 1 ;;
esac
