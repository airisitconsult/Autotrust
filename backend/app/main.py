import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core import storage
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import inspection, user, vehicle  # noqa: F401 - import registers the models on Base.metadata
from app.routers import admin, advisor, auth, inspections, reference, vehicles

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="AutoTrust API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 1: just create tables from models on startup. A real migration tool
# (Alembic) can replace this once the schema needs versioned changes.
Base.metadata.create_all(bind=engine)

if storage.backend_name() == "local":
    logger.warning(
        "Vehicle photos are stored on local disk (%s). That's fine for development; "
        "set the CLOUDINARY_* variables before deploying.",
        storage.UPLOAD_DIR,
    )
storage.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=storage.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(inspections.router)
app.include_router(admin.router)
app.include_router(advisor.router)
app.include_router(reference.router)


@app.get("/")
def root():
    return {"message": "AutoTrust API is running"}
