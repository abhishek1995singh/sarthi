# Sarthi — Project Knowledge Base

> Living doc for humans and agents. Update this file whenever you change architecture, auth, deploy, UX patterns, or domain rules.  
> Automation: see [How this file stays updated](#how-this-file-stays-updated).

**Last reviewed:** 2026-09-12

---

## What it is

Grain merchant & commission agent (**Pakki Aadhat**) desk app: purchases, sales, cash book, ledger, stock, bardana, reports — Hindi/English, mobile-first.

| Layer | Stack |
|--------|--------|
| Backend | Java 21, Spring Boot, PostgreSQL, Liquibase, JWT |
| Frontend | Angular 18 standalone, Material, signals where used |
| E2E | Playwright (`e2e/`) |
| Deploy | Docker Compose on a VPS (Postgres + API + Nginx + Caddy). `./deploy/deploy.sh` dumps Postgres, then rsyncs and rebuilds. |

---

## URLs & credentials

| | |
|--|--|
| Production | https://saarthi-mandi.online |
| Health | https://saarthi-mandi.online/api/actuator/health |
| GitHub | https://github.com/abhishek1995singh/sarthi |
| Local API | http://localhost:8080/api |
| Local UI | http://localhost:4200 |
| Default login | `admin` / `Admin@123` (OWNER) — not shown on the login page |

**VPS backups:** `./deploy/deploy.sh` (or `./deploy/deploy.sh backup`) writes gzipped dumps to `/var/backups/sarthi/` and copies them to local `deploy/backups/`. Restore with `./deploy/deploy.sh restore`.

**Automated daily backups (added Sep 2026):** `cron` was installed on the VPS (Debian image had none by default — `apt-get install cron`, `systemctl enable --now cron`) with a root crontab entry running `deploy/postgres-backup.sh backup` daily at `30 21 * * *` (21:30 UTC ≈ 3:00 AM IST), keeping the last 30 dumps (`BACKUP_KEEP=30`) in `/var/backups/sarthi/`, logging to `/var/log/sarthi-backup.log`. This is independent of the deploy-triggered backup. Check/edit with `ssh root@<vps-ip> crontab -l` / `crontab -e`. Data was reset (wiped to clean seed data) on 2026-09-18 for testing — production had zero real transactions at that point.

See also [DEPLOY.md](../DEPLOY.md).

---

## Domain model (high level)

- **Party** — AADHTI, BUYER, MILL, TRANSPORTER
- **Commodity / variety** — configurable commission, gaushala, bardana mode. Bags on purchase/sale are entered manually (no bag-weight setting).
- **Purchase** — draft → confirm (stock in + bardana). No Unpaid / Partial / Paid on the purchase; money is party ledger / cash book. Direct net payable = gross **+ gaushala + commission − cash discount**. Indirect is gross only.
- **Sale** — draft → confirm (stock out); receipts similarly. No commission on sales (removed Sep 2026) — total = base + tax + labour + transport; `commissionAmount` column/field still exists but is always written as 0 (no migration; kept for API shape stability only)
- **Cash book** — daily receipts/payments; posts to party ledger; opening balance / finalize day; **NEW:** paginated all-entries view with date filters
- **Ledger** — party outstanding, that party’s purchases (bills only, no Unpaid/Paid), paginated cash entries; Record Payment posts to cash book
- **Bardana** — bag exchange / cost-included tracking
- **Stock** — per variety weight + bags
- **P&L (Reports > P&L tab)** — trading margin, not agent-income: `income = Σ sale.totalAmount` minus `cost = Σ purchase.netPayable`. (Originally defined as sale-commission income minus purchase gaushala+commission cost, but sales no longer charge commission — see Sale note above — so it was redefined to this simpler buy/sell spread.) Bucketed daily (≤31d range) / weekly (≤120d) / monthly (longer), `GET /reports/pnl?from=&to=` → `PnLReportResponse`. Chart rendered with `chart.js` + `ng2-charts` (FE deps, `provideCharts()` in `app.config.ts`) — first chart library in the app; use `app-pnl-chart` (`shared/ui/pnl-chart/`) as the pattern for any future chart (reads theme colors from CSS vars in `ngOnChanges`, no chart lib theme reactivity beyond that).
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
  cashbook/       # Day view + paginated entries (GET /cashbook/entries?page=0&size=20&fromDate=&toDate=)
  config/security/
  ledger/         # Paginated party ledger
  master/         # Party, Commodity, AppUser, UserManagement, MeController
  purchase/
  report/
  sale/
  stock/
  bardana/
```

- Context path: `/api`
- Migrations: `backend/src/main/resources/db/changelog/` (Liquibase; preprod profile + `deploy/` Docker stack for single-server)
- `ddl-auto: validate` — schema only via Liquibase (`db/changelog`)
- **Pagination:** Cash book and ledger support paginated queries with `page`, `size` params (max 100/page)

---

## Frontend layout

```
frontend/src/app/
  core/           # auth, i18n, theme, services, models, config.json loader
  features/       # dashboard, purchase, sale, cashbook (day + all-entries views),
                  # ledger (paginated), bardana, masters, reports, settings, auth/login
  layout/shell/   # nav, single consolidated theme+language chip, user menu
  shared/
    status-badge/ # app-status-badge (kind→tone pill)
    ui/           # app-brand-mark, app-metric-card, app-page-header, app-empty-state, app-pnl-chart
```

- Prod API URL from `/config.json` (Vercel build writes `API_URL`)
- Shared mobile UX: cards on phone, tables on desktop (~900px), sticky FABs / bottom bars, bottom-sheet dialogs (`styles.scss`)
- Settings (`/settings`): Preferences | Users (OWNER) | Audit (OWNER)
- **Cash book** now supports Day View (existing) and All Entries View (paginated across dates)

---

## Design system (visual revamp, Sep 2026)

Sarthi's 6 theme palettes (Harvest/Forest/Ocean/Slate/Clay/Midnight, `core/theme/themes.ts` + `styles.scss` token blocks) were kept as-is — they were already considered. The revamp instead fixed generic-admin-template tells: an emoji logo, multi-color left-accent metric cards, no tabular figures for money, and a crowded topbar.

- **Tokens** (`styles.scss`): one radius rhythm `--radius-sm/md/lg/xl` (10/14/20/28px, was an uneven 8/12/16/24 mix) and softer two-layer shadows `--shadow-sm/md/lg`. New `.tabular-nums` utility (`font-variant-numeric: tabular-nums`) — also applied automatically via `.inr`; use it (or the class) on any list/table column showing money so digits stay aligned.
- **`--page-max-width` token** (`styles.scss`, `1560px`): shared cap for the page-root container on Dashboard, Purchase, Sale, Cash Book, and Ledger (`.dashboard`, `.purchase-page`, `.sale-page`, `.cashbook-page`, `.ledger-page`), all centered with `margin: 0 auto`. Replaced a set of inconsistent hardcoded caps (1100/1200px, and no cap at all on Ledger) that wasted horizontal space on laptops/wide monitors — since these pages already use fluid grids/tables, raising the cap lets existing cards/columns grow instead of requiring layout restructuring. Use this token (not a new hardcoded max-width) for any new full-page screen in this family.
- **Brand mark** (`shared/ui/brand-mark`): `<app-brand-mark [size]="18">` — an inline SVG (grain-ear glyph, `stroke="currentColor"`) that replaced the literal `⚖` emoji in the sidebar and login screen. Set `color` on an ancestor to recolor.
- **`shared/ui/metric-card`**: `<app-metric-card icon label value hint tone link>` — single-accent stat tile (icon chip + big number + label). `tone` is `'default' | 'positive' | 'negative' | 'info'` and should stay reserved for signed money (e.g. receivable = positive, payable = negative); don't give every card a different color again.
- **`shared/ui/page-header`**: `<app-page-header eyebrow title subtitle>` with `<ng-content>` for right-aligned actions — replaces the old hand-rolled `.page-header`/`.page-title`/`.page-subtitle` markup. All list/dashboard screens use it now.
- **`shared/ui/empty-state`**: `<app-empty-state icon message>` with `<ng-content>` for an optional CTA — for simple single-line empty states (richer empty states with heading+paragraph+CTA, e.g. Purchase list, still hand-roll their own markup).
- **Topbar**: theme switcher and language switcher were merged into one `prefsMenu` (chip shows current locale + theme swatches, opens one dropdown with a THEME section and a LANGUAGE section, separated by `.theme-menu-divider`) — see `layout/shell/shell.component.ts` and `features/auth/login/login.component.ts`.

---

## Mobile UX conventions

When changing list/feature screens:

1. Sticky filters/toolbars with safe-area padding
2. Mobile cards + `.table-only` desktop tables
3. Primary actions on cards / sticky bottom bar / FAB
4. Forms in `.dialog-overlay` bottom sheets (not browser `prompt`/`alert`)
5. i18n keys in `core/i18n/translations.ts` (en + hi)
6. Use the shared `shared/ui/*` primitives (page header, metric card, empty state) and the `--radius-*` tokens / `.tabular-nums` utility instead of hand-rolling new equivalents

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
- 2026-09-18 — Document daily VPS backup cron and prod data reset (de177a6)
- 2026-09-14 — Remove sale commission; redefine P&L as sale-vs-purchase trading margin (fb9ea49)
- 2026-09-13 — Add P&L chart to Reports (44d0ce4)
- 2026-09-12 — Fix stale commit hash in knowledge base log after amend (ac8fbed)
- 2026-09-12 — Visual revamp: shared UI primitives and wider page layouts (18bd7ec)
- 2026-09-12 — Simplify purchase payments and commodity settings (83b75e8)
- 2026-09-10 — Record the purchase bill fix in the knowledge base log. (8657781)
- 2026-09-10 — Add gaushala and commission to direct purchase net payable. (9f06cd8)
- 2026-09-10 — Harden VPS deploys with TLS, backups, and a credential-free login page. (44cbae7)
- 2026-08-17 — Switch Sarthi to Liquibase and add preprod plus Docker deploy stack. (4dae523)
- 2026-08-08 — Update knowledge base with cash book pagination feature (5f1cc97)
- 2026-08-08 — Add server-side ledger pagination and redesign party ledger UI. (09cad2d)
- 2026-08-08 — Update knowledge base commit log after gitignore change. (9dbb593)
- 2026-08-08 — Ignore local upload data and keep the knowledge base current. (8e06f70)
- 2026-08-08 — Add file storage service and enhance purchase/sale management. (2df1a4a)
- 2026-08-08 — Update knowledge base with recent commit log entry for Playwright E2E testing setup. (020c7ee)
- 2026-08-08 — Add Playwright E2E testing setup and knowledge base automation. (5521f3a)
- 2026-08-08 — Bootstrap knowledge base + commit automation (hooks, rule, script)
<!-- kb-commit-log:end -->
