# Git hooks (versioned)

This repo uses `core.hooksPath=.githooks` so hooks are shared.

## One-time setup (each clone)

```bash
git config core.hooksPath .githooks
```

## Hooks

| Hook | Behavior |
|------|----------|
| `prepare-commit-msg` | Reminds you if code is staged without `docs/KNOWLEDGE_BASE.md` |
| `post-commit` | Appends a line under **Recent commits** in the knowledge base |

Knowledge base: [`docs/KNOWLEDGE_BASE.md`](../docs/KNOWLEDGE_BASE.md)
