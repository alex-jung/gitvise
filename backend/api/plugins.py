from fastapi import APIRouter, Request

router = APIRouter(tags=["plugins"])


@router.get("/plugins")
async def list_plugins(request: Request):
    """Return all registered plugin manifests. Used by the frontend to build navigation."""
    registry = request.app.state.plugin_registry
    return [p.to_dict() for p in registry.all()]
