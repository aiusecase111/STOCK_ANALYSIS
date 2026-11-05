import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import models  # ensure models are registered
from app.api import sectors, stocks, analysis, imports

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Stock Research Dashboard API",
    description="Personal stock research management system for Indian markets.",
    version="1.0.0",
)

# CORS — always allow localhost for dev; add FRONTEND_URL env var in Railway
_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
if _frontend_url:
    _origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sectors.router)
app.include_router(stocks.router)
app.include_router(analysis.router)
app.include_router(imports.router)


@app.get("/")
def root():
    return {"message": "Stock Research Dashboard API is running.", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
