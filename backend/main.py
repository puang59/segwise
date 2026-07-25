"""
Segwise API — Banking Analytics Multi-Agent API Core Server.

Main FastAPI application entry point initializing middleware, CORS settings, database schemas,
and including all Phase 3 API routers (chat, models, segments, customers, export).
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import init_db
from backend.routers.chat import router as chat_router
from backend.routers.models import router as models_router
from backend.routers.segments import router as segments_router
from backend.routers.customers import router as customers_router
from backend.routers.export import router as export_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("segwise-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("[segwise-api] Initializing database tables...")
    try:
        init_db()
        logger.info("[segwise-api] Database initialized successfully.")
    except Exception as e:
        logger.error(f"[segwise-api] Database initialization failed: {e}")
    yield
    logger.info("[segwise-api] Shutting down application...")


# Setup FastAPI instance
app = FastAPI(
    title="segwise-api",
    description="Segwise Banking Analytics Multi-Agent API Core Server",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS Middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(chat_router)
app.include_router(models_router)
app.include_router(segments_router)
app.include_router(customers_router)
app.include_router(export_router)


@app.get("/", tags=["Health"])
def health_check():
    """Health check & status endpoint."""
    return {
        "status": "online",
        "app_name": "segwise-api",
        "version": "1.0.0",
        "message": "Segwise Banking Analytics Multi-Agent API is running smoothly."
    }
