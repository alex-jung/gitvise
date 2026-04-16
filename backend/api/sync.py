from fastapi import APIRouter, Request

router = APIRouter(tags=["sync"])


@router.get("/sync/status")
async def get_sync_status(request: Request):
    """Return the current sync engine status."""
    engine = request.app.state.sync_engine
    return engine.status


@router.post("/sync/trigger")
async def trigger_sync(request: Request):
    """Manually trigger a sync run."""
    engine = request.app.state.sync_engine
    import asyncio
    asyncio.create_task(engine.trigger())
    return {"triggered": True}
