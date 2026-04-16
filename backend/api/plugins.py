from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

router = APIRouter(tags=["plugins"])


@router.get("/plugins")
async def list_plugins(request: Request):
    """Return all registered plugin manifests. Used by the frontend to build navigation."""
    registry = request.app.state.plugin_registry
    return [p.to_dict() for p in registry.all()]


@router.get("/plugins/{plugin_id}/bundle")
async def get_plugin_bundle(plugin_id: str, request: Request):
    """Serve the compiled frontend bundle for an external plugin."""
    registry = request.app.state.plugin_registry
    manifest = registry.get(plugin_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Plugin not found")
    bundle_path = manifest.bundle_path
    if not bundle_path:
        raise HTTPException(status_code=404, detail="No bundle available for this plugin")
    return FileResponse(bundle_path, media_type="application/javascript")
