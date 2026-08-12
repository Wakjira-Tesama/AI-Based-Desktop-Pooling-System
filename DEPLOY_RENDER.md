# Deploy notes (current stack)

SDPMS currently ships as:

- **Backend:** Node.js/Express + MongoDB (Docker on Render)
- **Frontend:** Vite/React (Vercel or Netlify static hosting)

## Backend on Render

1. Connect this GitHub repo and use the root `Dockerfile`.
2. Set environment variables:
   - `MONGODB_URI` (required) — MongoDB Atlas / hosted Mongo connection string
   - `JWT_SECRET` (required)
   - `ACCESS_TOKEN_EXPIRE_MINUTES` (optional, default via app)
   - `AUTO_SEED` (optional)
3. Health check path: `/health`
4. Free-tier instances sleep; first request after idle may take 30–60s.

> Note: Older docs mentioning FastAPI/`DATABASE_URL`/`SECRET_KEY` refer to a previous Python stack. Prefer `MONGODB_URI` + `JWT_SECRET` with the Node backend.

## Frontend on Vercel

1. Import the same GitHub repo in Vercel.
2. Root `vercel.json` builds `frontend/` and publishes `frontend/dist`.
3. Optional build env: `VITE_API_URL=https://ai-based-desktop-pooling-system-1.onrender.com`
4. SPA routes are rewritten to `index.html`.

## Local development

```bash
# Backend
npm --prefix backend install
npm --prefix backend start

# Frontend
npm --prefix frontend install
npm --prefix frontend run dev
```
