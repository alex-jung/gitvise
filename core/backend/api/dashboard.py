"""Dashboard config API – stores and retrieves dashboard layouts."""
import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session as DBSession

from api.setup import _get_config, _set_config
from core.db import get_db

router = APIRouter(tags=["dashboard"])

DASHBOARD_CONFIG_KEY = "dashboard_config"


def _default_dashboard(request: Request) -> dict:
    """Generate a default dashboard from registered widget manifests."""
    registry = getattr(request.app.state, "plugin_registry", None)
    layout = []
    row = 1
    col = 1

    if registry:
        for plugin in registry.all():
            for widget in plugin.widgets:
                layout.append({
                    "widgetId": widget["id"],
                    "pluginId": plugin.id,
                    "row": row,
                    "col": col,
                    "width": widget.get("defaultSize", "1/3"),
                    "config": {
                        k: v.get("default")
                        for k, v in widget.get("config", {}).items()
                        if "default" in v
                    },
                })
                col += 1
                if col > 3:
                    col = 1
                    row += 1

    return {
        "dashboards": [
            {
                "id": "default",
                "name": "Overview",
                "isDefault": True,
                "layout": layout,
            }
        ]
    }


@router.get("/dashboard")
async def get_dashboard(request: Request, db: DBSession = Depends(get_db)):
    raw = _get_config(db, DASHBOARD_CONFIG_KEY)
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    # First call: return generated default (but don't persist yet)
    return _default_dashboard(request)


def _enforce_community_config(widget_def: dict, config: dict, has_license: bool) -> dict:
    """Reset Pro-only config fields to their community defaults when no license is present."""
    if has_license:
        return config
    result = dict(config)
    for key, field in widget_def.get("config", {}).items():
        if field.get("tier") == "pro":
            result[key] = field.get("default")
    return result


@router.post("/dashboard")
async def save_dashboard(request: Request, db: DBSession = Depends(get_db)):
    body = await request.json()

    # Enforce community config limits: reset Pro fields when no license key
    has_license = bool(_get_config(db, "license_key"))
    registry = getattr(request.app.state, "plugin_registry", None)

    if registry and not has_license:
        widget_map: dict[str, dict] = {}
        for plugin in registry.all():
            for w in plugin.widgets:
                widget_map[w["id"]] = w

        for dashboard in body.get("dashboards", []):
            for item in dashboard.get("layout", []):
                widget_def = widget_map.get(item.get("widgetId", ""), {})
                if widget_def:
                    item["config"] = _enforce_community_config(widget_def, item.get("config", {}), False)

    _set_config(db, DASHBOARD_CONFIG_KEY, json.dumps(body))
    db.commit()
    return {"success": True}


@router.post("/dashboard/reset")
async def reset_dashboard(request: Request, db: DBSession = Depends(get_db)):
    """Reset to the auto-generated default dashboard."""
    default = _default_dashboard(request)
    _set_config(db, DASHBOARD_CONFIG_KEY, json.dumps(default))
    db.commit()
    return default


@router.get("/widgets")
async def get_widgets(request: Request):
    """Return all registered widget definitions for the widget catalog."""
    registry = getattr(request.app.state, "plugin_registry", None)
    if not registry:
        return []
    result = []
    for plugin in registry.all():
        for widget in plugin.widgets:
            result.append({
                **widget,
                "pluginId": plugin.id,
                "pluginName": plugin.name,
                "pluginTier": plugin.tier,
            })
    return result
