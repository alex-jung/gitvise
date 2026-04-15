from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.auth import auth_middleware
from core.config import settings
from core.db import init_db
from core.plugin_registry import PluginRegistry
from core.sync_engine import SyncEngine
from api.auth import router as auth_router
from api.dashboard import router as dashboard_router
from api.setup import router as setup_router
from api.plugins import router as plugins_router
from api.sync import router as sync_router
from api.repos import router as repos_router
from api.pull_requests import router as pull_requests_router
from api.ci_cd import router as ci_cd_router


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

    # Trigger an immediate sync on startup if setup is already completed
    import asyncio
    from core.db import SessionLocal
    from api.setup import _get_config as _cfg
    _db = SessionLocal()
    try:
        if _cfg(_db, "setup_completed") == "true":
            asyncio.create_task(engine.trigger())
    finally:
        _db.close()

    print(f"[gitvise] Core API ready on port {settings.port}")
    yield

    # ── Shutdown ─────────────────────────────────────────────
    await engine.stop()


app = FastAPI(
    title="Gitvise Core API",
    version="0.1.0",
    lifespan=lifespan,
)

# Auth middleware must be registered BEFORE CORSMiddleware so that CORS
# becomes the outermost layer (last registered = outermost in Starlette).
# This ensures CORS headers are added even to 401 error responses.
app.middleware("http")(auth_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/core")
app.include_router(dashboard_router, prefix="/api/core")
app.include_router(setup_router, prefix="/api/core")
app.include_router(plugins_router, prefix="/api/core")
app.include_router(sync_router, prefix="/api/core")
app.include_router(repos_router, prefix="/api/core")
app.include_router(pull_requests_router, prefix="/api/core")
app.include_router(ci_cd_router, prefix="/api/core")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
