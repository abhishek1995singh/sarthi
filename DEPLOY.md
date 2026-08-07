# Deploy guide — Sarthi

## Important: Vercel cannot host the Spring Boot API

Vercel is for static/frontend and serverless Node/Edge functions.
This backend is a long-running JVM + PostgreSQL app, so it must run on
**Render**, **Railway**, **Fly.io**, or similar.

Recommended split:

| Piece | Host |
|--------|------|
| Angular UI | **Vercel** |
| Spring Boot API | **Render** (or Railway) |
| PostgreSQL | Render/Railway managed DB |

---

## 1) Backend (Render) — live

| | |
|--|--|
| API | https://sarthi-api-t2bd.onrender.com/api |
| Health | https://sarthi-api-t2bd.onrender.com/api/actuator/health |
| Dashboard | https://dashboard.render.com/web/srv-d9qpir2jnfac73dv8eqg |
| Repo | https://github.com/abhishek1995singh/sarthi |
| Postgres | `sarthi-db` (free; expires ~30 days unless upgraded) |

`CORS_ORIGINS` is currently `http://localhost:4200`. After Vercel deploy, set it to your Vercel origin and redeploy.

To recreate from scratch: push repo → **New → Blueprint** with root `render.yaml`, or CLI `render services create` + `render postgres create`.

Local Docker check:

```bash
cd backend
docker build -t sarthi-api .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL='postgresql://sarthi:sarthi123@host.docker.internal:5432/sarthi_db' \
  -e CORS_ORIGINS='http://localhost:4200' \
  -e JWT_SECRET='change-me-to-a-long-random-string' \
  sarthi-api
```

---

## 2) Frontend (Vercel)

From `frontend/`:

```bash
cd frontend
npx vercel login
npx vercel link
npx vercel env add API_URL production
# value: https://YOUR-API.onrender.com/api

npx vercel --prod
```

`API_URL` is written into `public/config.json` at build time.

SPA routing is handled by `vercel.json`.

---

## 3) Wire them together

1. Deploy API first → copy `/api` base URL.
2. Set Vercel env `API_URL` = that URL.
3. Set Render `CORS_ORIGINS` = your Vercel origin (no trailing slash).
4. Redeploy both if either URL changes.

Login: `admin` / `Admin@123` (change after first deploy).
