#!/usr/bin/env bash
# Cursor hook: after a successful git commit, nudge if KB was not in that commit.
set -euo pipefail

input="$(cat)"
cmd="$(printf '%s' "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))" 2>/dev/null || true)"
status="$(printf '%s' "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exit_code',0))" 2>/dev/null || echo 0)"

# Only care about successful commits
if [[ "$status" != "0" ]] || ! printf '%s' "$cmd" | grep -qE 'git[[:space:]]+commit'; then
  echo '{}'
  exit 0
fi

ROOT="$(pwd)"
# If HEAD commit does not include the KB file, remind the agent
if ! git -C "$ROOT" show --name-only --pretty=format: HEAD 2>/dev/null | grep -qx 'docs/KNOWLEDGE_BASE.md'; then
  python3 - <<'PY'
import json
print(json.dumps({
  "additional_context": (
    "This git commit did not include docs/KNOWLEDGE_BASE.md. "
    "If the change affected architecture, APIs, auth, deploy, or UX patterns, "
    "update docs/KNOWLEDGE_BASE.md now and commit it (or amend if appropriate). "
    "Run ./scripts/kb-append-commit.sh to append the Recent commits line."
  )
}))
PY
  exit 0
fi

echo '{}'
exit 0
