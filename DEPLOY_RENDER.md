# Deploy on Render (Free)

This project is configured for Render using `render.yaml`.

## What is included

- Backend web service (`FastAPI`): `sdpms-backend`
- Frontend static site (`Vite`): `sdpms-frontend`
- SPA rewrite for frontend routes
- Environment-based API URL and CORS

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
- `CORS_ORIGINS`
  - Must include your real frontend URL (for example: `https://sdpms-frontend.onrender.com`)

### Frontend (`sdpms-frontend`)

- `VITE_API_URL`
  - Must point to your backend URL (for example: `https://sdpms-backend.onrender.com`)

If your generated Render service URLs differ from `sdpms-frontend` or `sdpms-backend`, update both env vars to match.

## 4) Redeploy after env changes

If you change env vars, trigger redeploy for both services.

## Important note about free hosting

- This project currently uses SQLite (`sql_app.db`).
- On free cloud instances, local filesystem is not durable across restarts/redeploys.
- For persistent production data, switch to a managed DB and set `DATABASE_URL`.

## Optional: Deploy only backend (quick API test)

If you only need API first:

1. Create one **Web Service**.
2. Build command: `pip install -r backend/requirements.txt`
3. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add env var `SECRET_KEY`.
