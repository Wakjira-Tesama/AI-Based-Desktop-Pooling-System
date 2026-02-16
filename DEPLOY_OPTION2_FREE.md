# Option 2 (No Card): Vercel Backend + Netlify Frontend

This path avoids Render billing requirements.

## Architecture

- Backend API (FastAPI): Vercel
- Frontend (Vite React): Netlify

## 1) Deploy backend on Vercel (free)

1. Go to https://vercel.com/new
2. Import repo: `Wakjira-Tesama/AI-Based-Desktop-Pooling-System`
3. Configure project:
   - Framework Preset: Other
   - Root Directory: `.`
4. Environment Variables (Project Settings -> Environment Variables):
   - `SECRET_KEY` = a long random value
   - `ACCESS_TOKEN_EXPIRE_MINUTES` = `30`
   - `CORS_ORIGINS` = `https://<your-netlify-site>.netlify.app,http://localhost:5173,http://localhost:5479,http://localhost:5480`
5. Deploy.

Expected backend URL example:

- `https://ai-based-desktop-pooling-system.vercel.app`

## 2) Deploy frontend on Netlify (free)

1. Go to https://app.netlify.com/start
2. Import from GitHub and pick the same repo.
3. Configure build:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add Environment Variable:
   - `VITE_API_URL` = your Vercel backend URL from step 1
5. Deploy site.

`frontend/netlify.toml` already includes SPA redirect.

## 3) Final CORS update

After Netlify gives your final URL:

1. Go to Vercel project settings.
2. Update backend `CORS_ORIGINS` to include that exact Netlify URL.
3. Redeploy Vercel backend.

## Notes

- This stack runs without adding billing cards (depending on current platform policy).
- SQLite storage is ephemeral on serverless environments, so data can reset.
- For persistent production data, later switch backend `DATABASE_URL` to external Postgres (e.g., Neon/Supabase free tiers).
