#!/usr/bin/env bash
# Append last commit summary into docs/KNOWLEDGE_BASE.md Recent commits section.
# Usage:
#   ./scripts/kb-append-commit.sh           # append HEAD
#   ./scripts/kb-append-commit.sh --staged  # exit 1 if code staged but KB not staged
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KB="$ROOT/docs/KNOWLEDGE_BASE.md"
START='<!-- kb-commit-log:start -->'
END='<!-- kb-commit-log:end -->'

if [[ "${1:-}" == "--staged" ]]; then
  code_staged="$(git -C "$ROOT" diff --cached --name-only -- \
    'backend/**' 'frontend/src/**' 'e2e/**' 'render.yaml' 'DEPLOY.md' \
    | grep -v 'docs/KNOWLEDGE_BASE.md' || true)"
  kb_staged="$(git -C "$ROOT" diff --cached --name-only -- 'docs/KNOWLEDGE_BASE.md' || true)"
  if [[ -n "$code_staged" && -z "$kb_staged" ]]; then
    echo "kb-append-commit: code is staged but docs/KNOWLEDGE_BASE.md is not." >&2
    echo "Update the knowledge base (or run with intent to skip), then git add docs/KNOWLEDGE_BASE.md" >&2
    exit 1
  fi
  exit 0
fi

if [[ ! -f "$KB" ]]; then
  echo "Missing $KB" >&2
  exit 1
fi

hash="$(git -C "$ROOT" rev-parse --short HEAD)"
date="$(git -C "$ROOT" show -s --format=%cs HEAD)"
subject="$(git -C "$ROOT" show -s --format=%s HEAD | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
line="- ${date} — ${subject} (${hash})"

# Skip if this hash already logged
if grep -q "(${hash})" "$KB"; then
  exit 0
fi

tmp="$(mktemp)"
awk -v start="$START" -v end="$END" -v line="$line" '
  $0 == start { print; print line; next }
  { print }
' "$KB" > "$tmp"
mv "$tmp" "$KB"
echo "Appended to knowledge base: $line"
