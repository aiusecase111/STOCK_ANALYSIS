# Deploying to Railway

Two services: **backend** (FastAPI) and **frontend** (React). Takes ~10 minutes.

---

## Prerequisites

- A [Railway](https://railway.app) account (free)
- Your code pushed to a GitHub repository
- [Railway CLI](https://docs.railway.app/develop/cli) (optional but handy)

---

## Step 1 — Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2 — Deploy the Backend

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway will detect the `backend/` folder — set the **Root Directory** to `backend`
4. It will auto-detect `requirements.txt` and use `backend/railway.toml` for the start command
5. Once deployed, Railway gives you a URL like `https://stock-backend-xxxx.up.railway.app`
   — copy it, you'll need it next

### Add a Volume (so SQLite data persists across redeploys)

1. In your backend service → **Volumes** tab → **Add Volume**
2. Mount path: `/app/data`
3. Then set this environment variable in the backend service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `sqlite:////app/data/stock_research.db` |

> Update `backend/app/database.py` to read from this env var — see note below.

---

## Step 3 — Deploy the Frontend

1. In the same Railway project → **New Service** → **Deploy from GitHub repo**
2. Select the same repository, set **Root Directory** to `frontend`
3. Railway uses `frontend/railway.toml` — it runs `npm install && npm run build` then serves with `serve`
4. Once deployed, copy the frontend URL (e.g. `https://stock-frontend-xxxx.up.railway.app`)

### Set environment variables on the **frontend** service

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://stock-backend-xxxx.up.railway.app/api` |

### Set environment variables on the **backend** service

| Variable | Value |
|---|---|
| `FRONTEND_URL` | `https://stock-frontend-xxxx.up.railway.app` |

---

## Step 4 — Redeploy both services

After setting env vars, trigger a redeploy on both services so the values take effect:
- Service → **Deployments** → **Redeploy**

---

## Step 5 — Verify

- Open your frontend URL in the browser — the login page should appear
- Log in with `Dharm` / `Dharm`
- Check the Dashboard loads data correctly
- Try importing an Excel file to confirm the backend is writing to the volume

---

## Database persistence note

By default `database.py` uses a hardcoded path relative to the project. To make it
respect the `DATABASE_URL` env var on Railway, update `backend/app/database.py`:

```python
import os
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{os.path.join(BASE_DIR, 'stock_research.db')}"
)
```

This way locally it still uses the project-local SQLite file, but on Railway it uses
the persistent volume at `/app/data/stock_research.db`.

---

## Local development (unchanged)

```bash
# Backend
cd backend
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`, proxies `/api` calls to `http://localhost:8000`.
