from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.db import init_db
from core.plugin_registry import PluginRegistry
from core.sync_engine import SyncEngine
from api.setup import router as setup_router
from api.plugins import router as plugins_router
from api.sync import router as sync_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────
    init_db()

    registry = PluginRegistry()
    registry.scan()
    app.state.plugin_registry = registry

    engine = SyncEngine(registry)
    await engine.start()
    app.state.sync_engine = engine

    print(f"[gitvise] Core API ready on port {settings.port}")
    yield

    # ── Shutdown ─────────────────────────────────────────────
    await engine.stop()


app = FastAPI(
    title="Gitvise Core API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(setup_router, prefix="/api/core")
app.include_router(plugins_router, prefix="/api/core")
app.include_router(sync_router, prefix="/api/core")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
