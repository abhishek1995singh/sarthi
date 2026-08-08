# Sarthi — Project Knowledge Base

> Living doc for humans and agents. Update this file whenever you change architecture, auth, deploy, UX patterns, or domain rules.  
> Automation: see [How this file stays updated](#how-this-file-stays-updated).

**Last reviewed:** 2026-08-08

---

## What it is

Grain merchant & commission agent (**Pakki Aadhat**) desk app: purchases, sales, cash book, ledger, stock, bardana, reports — Hindi/English, mobile-first.

| Layer | Stack |
|--------|--------|
| Backend | Java 21, Spring Boot, PostgreSQL, Flyway, JWT |
| Frontend | Angular 18 standalone, Material, signals where used |
| E2E | Playwright (`e2e/`) |
| Deploy | API → Render; UI → Vercel |

---

## URLs & credentials

| | |
|--|--|
| Frontend | https://sarthi-tan.vercel.app |
| API | https://sarthi-api-t2bd.onrender.com/api |
| Health | https://sarthi-api-t2bd.onrender.com/api/actuator/health |
| GitHub | https://github.com/abhishek1995singh/sarthi |
| Local API | http://localhost:8080/api |
| Local UI | http://localhost:4200 |
| Default login | `admin` / `Admin@123` (OWNER) |

**Render free tier:** service sleeps after ~15 min idle; first request can take 30–60s. Vercel FE is fine; API must warm up.

See also [DEPLOY.md](../DEPLOY.md).

---

## Domain model (high level)

- **Party** — AADHTI, BUYER, MILL, TRANSPORTER
- **Commodity / variety** — configurable commission, gaushala, bardana mode, bag weight
- **Purchase** — draft → confirm (stock in + bardana); payments via cash book / ledger
- **Sale** — draft → confirm (stock out); receipts similarly
- **Cash book** — daily receipts/payments; posts to party ledger; opening balance / finalize day
- **Ledger** — auto-posted party balances
- **Bardana** — bag exchange / cost-included tracking
- **Stock** — per variety weight + bags
- **Users** — single company install; roles `OWNER` | `STAFF`
- **Audit** — money + masters + auth (not commodities/stock/bardana/reports)

---

## Auth & multi-user

- JWT; `ROLE_OWNER` / `ROLE_STAFF`
- OWNER-only: `/api/users/**`, `/api/audit/**`
- Inactive users cannot log in
- Cannot disable self; must keep ≥1 active OWNER
- Prefs on user: `preferred_locale` (`en`\|`hi`), `preferred_theme` (harvest, forest, ocean, slate, clay, midnight)
- Login returns `id`, prefs; FE applies on login; header chips + Settings sync via `PUT /api/me/preferences`
- Audit actions include: CREATE, UPDATE, DELETE, CONFIRM, LOGIN, LOGIN_FAILED, LOGOUT, DISABLE, ENABLE, PASSWORD_RESET

---

## Backend layout

```
backend/src/main/java/com/sarthi/
  audit/          # AuditLog, AuditService (best-effort, never breaks money ops)
  cashbook/
  config/security/
  ledger/
  master/         # Party, Commodity, AppUser, UserManagement, MeController
  purchase/
  report/
  sale/
  stock/
  bardana/
```

- Context path: `/api`
- Migrations: `backend/src/main/resources/db/migration/` (`V1`…`V4` prefs + audit actions)
- `ddl-auto: validate` — schema only via Flyway

---

## Frontend layout

```
frontend/src/app/
  core/           # auth, i18n, theme, services, models, config.json loader
  features/       # dashboard, purchase, sale, cashbook, ledger, bardana,
                  # masters, reports, settings, auth/login
  layout/shell/   # nav, theme/lang chips, user menu
```

- Prod API URL from `/config.json` (Vercel build writes `API_URL`)
- Shared mobile UX: cards on phone, tables on desktop (~900px), sticky FABs / bottom bars, bottom-sheet dialogs (`styles.scss`)
- Settings (`/settings`): Preferences | Users (OWNER) | Audit (OWNER)

---

## Mobile UX conventions

When changing list/feature screens:

1. Sticky filters/toolbars with safe-area padding
2. Mobile cards + `.table-only` desktop tables
3. Primary actions on cards / sticky bottom bar / FAB
4. Forms in `.dialog-overlay` bottom sheets (not browser `prompt`/`alert`)
5. i18n keys in `core/i18n/translations.ts` (en + hi)

---

## Local run

```bash
# DB: PostgreSQL sarthi_db / sarthi / sarthi123 (see application.yml)

cd backend && ./mvnw spring-boot:run
cd frontend && npm start
cd e2e && npm test   # API must already be running
```

Restart the backend after adding new controllers — a stale JVM returns 500 `No static resource …`.

---

## How this file stays updated

Three layers (use all of them):

### 1. Cursor rule (semantic updates)

`.cursor/rules/knowledge-base.mdc` — agents must update this KB when committing meaningful changes (architecture, APIs, deploy, roles, UX patterns).

### 2. Git hook (every local commit)

```bash
git config core.hooksPath .githooks   # once per clone
```

`.githooks/prepare-commit-msg` reminds if code changed but `docs/KNOWLEDGE_BASE.md` is not staged.  
`.githooks/post-commit` appends a one-line entry under **Recent commits** (mechanical log; may leave KB dirty — include it in the next commit or run the helper).

### 3. Helper script

```bash
./scripts/kb-append-commit.sh           # append last commit to Recent commits
./scripts/kb-append-commit.sh --staged  # warn if KB missing from index before commit
```

### What belongs in the KB vs commit log

| Update | Where |
|--------|--------|
| New endpoint, role rule, deploy URL, domain rule, UX pattern | Edit sections above |
| Routine bugfix / copy tweak | Recent commits line is enough |
| Secrets / passwords beyond seed admin | Never |

---

## Recent commits

<!-- kb-commit-log:start -->
- 2026-08-08 — Update knowledge base commit log after gitignore change. (9dbb593)
- 2026-08-08 — Ignore local upload data and keep the knowledge base current. (8e06f70)
- 2026-08-08 — Add file storage service and enhance purchase/sale management. (2df1a4a)
- 2026-08-08 — Update knowledge base with recent commit log entry for Playwright E2E testing setup. (020c7ee)
- 2026-08-08 — Add Playwright E2E testing setup and knowledge base automation. (5521f3a)
- 2026-08-08 — Bootstrap knowledge base + commit automation (hooks, rule, script)
<!-- kb-commit-log:end -->
