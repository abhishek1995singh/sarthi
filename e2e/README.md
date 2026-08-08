# Sarthi Playwright E2E

Browser tests for the Sarthi Angular app against a running Spring Boot API.

## Prerequisites

1. PostgreSQL with `sarthi_db` (user `sarthi` / password `sarthi123` per `backend/src/main/resources/application.yml`)
2. Backend on `http://localhost:8080/api`
3. Node 18+

## Quick start

```bash
# Terminal 1 — API
cd backend && ./mvnw spring-boot:run

# Terminal 2 — UI (or let Playwright start it)
cd frontend && npm start

# Terminal 3 — tests
cd e2e
cp .env.example .env
npm install
npx playwright install chromium
npm test
```

Playwright can auto-start the frontend (`ng serve`). The API must already be running.

## Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all specs headless |
| `npm run test:headed` | Run with visible browser |
| `npm run test:ui` | Playwright UI mode |
| `npm run report` | Open HTML report |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://localhost:4200` | Angular app URL |
| `SARTHI_USER` | `admin` | Login username |
| `SARTHI_PASSWORD` | `Admin@123` | Login password |
| `SKIP_WEBSERVER` | unset | Skip auto-starting `ng serve` |

## Playwright MCP (Cursor)

`playwright.mcp.config.json` at the repo root configures the Cursor Playwright MCP server:

- Chromium, headed mode
- Allowed origins: `localhost:4200`, `4201`, `8080`

Start the app locally, then ask Cursor to exercise flows (login, navigation, reports) via MCP browser tools.

## Specs

| File | Coverage |
|------|----------|
| `login.spec.ts` | Login form, bad credentials, valid login |
| `navigation.spec.ts` | All shell routes, sign out |
| `dashboard.spec.ts` | Metrics, quick actions, reports |
| `party.spec.ts` | Create party, type filter, form validation |
| `purchase.spec.ts` | End-to-end: party → draft purchase → confirm → pay |

Shared helpers live in `support/ui.ts` (mat-select, dialogs, create party, record purchase).
