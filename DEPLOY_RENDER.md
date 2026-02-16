# Deploy on Render (Free)

This project is configured for Render using `render.yaml`.

## What is included

- Backend web service (`FastAPI`): `sdpms-backend`
- Frontend static site (`Vite`): `sdpms-frontend`
- Managed Postgres database: `sdpms-db`
- SPA rewrite for frontend routes
- Environment-based API URL and CORS
- Optional auto-seeding on backend start (`AUTO_SEED=true`)

## 1) Push this repo to GitHub

Make sure your latest changes (including `render.yaml`) are in GitHub.

## 2) Create services from Blueprint

1. Go to Render Dashboard.
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repo.
4. Render will detect `render.yaml` and create both services.

## 3) Verify environment values

After first creation, check these values in Render:

### Backend (`sdpms-backend`)

- `SECRET_KEY` (auto-generated)
- `ACCESS_TOKEN_EXPIRE_MINUTES=30`
- `DATABASE_URL` (auto-linked from Render database)
- `AUTO_SEED=true` (creates seed users/desktops if missing)
- `CORS_ORIGINS`
  - Must include your real frontend URL (for example: `https://sdpms-frontend.onrender.com`)

Seed user env vars (can be customized in Render):

- `SEED_STUDENT_EMAIL`, `SEED_STUDENT_PASSWORD`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`

### Frontend (`sdpms-frontend`)

- `VITE_API_URL`
  - Must point to your backend URL (for example: `https://sdpms-backend.onrender.com`)

If your generated Render service URLs differ from `sdpms-frontend` or `sdpms-backend`, update both env vars to match.

## 4) Redeploy after env changes

If you change env vars, trigger redeploy for both services.

## 5) First login after deploy

With `AUTO_SEED=true`, use seeded credentials from backend env vars:

- Student: `SEED_STUDENT_EMAIL` / `SEED_STUDENT_PASSWORD`
- Admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`

After first successful setup, you can set `AUTO_SEED=false` if you do not want startup seeding checks.

## Important note about free hosting

- This setup uses managed Postgres (`sdpms-db`) for persistent data.
- If your Render account does not offer free Postgres, keep the same backend config and use an external free Postgres provider (for example Neon/Supabase), then set backend `DATABASE_URL` manually.
- Do not rely on SQLite in production on Render because local filesystem is not durable.

## Optional: Deploy only backend (quick API test)

If you only need API first:

1. Create one **Web Service**.
2. Build command: `pip install -r backend/requirements.txt`
3. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add env var `SECRET_KEY`.
