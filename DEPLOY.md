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

## 1) Backend (Render)

From `backend/`:

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New → Blueprint** → select repo → `backend/render.yaml`.
3. Set env var `CORS_ORIGINS` to your Vercel URL, e.g.  
   `https://sarthi-xxx.vercel.app`
4. Deploy. Note the public URL, e.g. `https://sarthi-api.onrender.com`  
   (API base is `https://sarthi-api.onrender.com/api`).

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
