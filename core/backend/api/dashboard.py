"""Dashboard config API – stores and retrieves dashboard layouts."""
import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session as DBSession

from api.setup import _get_config, _set_config
from core.db import get_db
from core.license import is_pro

router = APIRouter(tags=["dashboard"])

DASHBOARD_CONFIG_KEY = "dashboard_config"


def _widget_defaults(widget: dict) -> dict:
    """Extract default config values from a widget definition."""
    return {
        k: v.get("default")
        for k, v in widget.get("config", {}).items()
        if "default" in v
    }


def _span(width: str) -> int:
    if width == "full":
        return 3
    if width == "2/3":
        return 2
    return 1


def _build_layout_from_spec(spec: list[dict], plugin) -> list[dict]:
    """Convert a plugin's defaultDashboard.layout spec into full layout items.

    Auto-computes row/col and merges widget defaults with any spec-level config overrides.
    """
    widget_map = {w["id"]: w for w in plugin.widgets}
    layout = []
    col = 1
    row = 1

    for item in spec:
        widget_id = item.get("widgetId")
        if not widget_id:
            continue
        widget_def = widget_map.get(widget_id, {})
        width = item.get("width") or widget_def.get("defaultSize", "1/3")
        span = _span(width)

        # Wrap to next row if widget doesn't fit
        if col + span - 1 > 3:
            col = 1
            row += 1

        config = {**_widget_defaults(widget_def), **item.get("config", {})}

        layout.append({
            "widgetId": widget_id,
            "pluginId": plugin.id,
            "row": row,
            "col": col,
            "width": width,
            "config": config,
        })

        col += span
        if col > 3:
            col = 1
            row += 1

    return layout


def _build_layout_from_widgets(plugin) -> list[dict]:
    """Auto-generate a flat layout from all of a plugin's widgets (fallback)."""
    layout = []
    col = 1
    row = 1
    for widget in plugin.widgets:
        width = widget.get("defaultSize", "1/3")
        span = _span(width)
        if col + span - 1 > 3:
            col = 1
            row += 1
        layout.append({
            "widgetId": widget["id"],
            "pluginId": plugin.id,
            "row": row,
            "col": col,
            "width": width,
            "config": _widget_defaults(widget),
        })
        col += span
        if col > 3:
            col = 1
            row += 1
    return layout


def _default_dashboard(request: Request) -> dict:
    """Generate default dashboards from registered plugin manifests.

    Each plugin that defines a ``defaultDashboard`` in its plugin.json gets its
    own named dashboard tab.  Plugins without a ``defaultDashboard`` fall back
    to an auto-generated flat layout from their widget list.
    """
    registry = getattr(request.app.state, "plugin_registry", None)
    dashboards = []

    if registry:
        for plugin in registry.all():
            if plugin.default_dashboard:
                spec = plugin.default_dashboard.get("layout", [])
                layout = _build_layout_from_spec(spec, plugin)
                name = plugin.default_dashboard.get("name", plugin.name)
            else:
                layout = _build_layout_from_widgets(plugin)
                name = plugin.name

            if not layout:
                continue

            dashboards.append({
                "id": plugin.id,
                "name": name,
                "isDefault": len(dashboards) == 0,
                "layout": layout,
            })

    if not dashboards:
        dashboards = [{"id": "default", "name": "Overview", "isDefault": True, "layout": []}]

    return {"dashboards": dashboards}


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
    """Reset Pro-only config fields to their community defaults when no license is present.

    Also caps numeric fields that define a ``maxCommunity`` ceiling so extended
    time ranges (> 90 days) are only available to Pro users.
    """
    if has_license:
        return config
    result = dict(config)
    for key, field in widget_def.get("config", {}).items():
        # Hard-lock entire Pro fields
        if field.get("tier") == "pro":
            result[key] = field.get("default")
            continue
        # Cap numeric fields to their community maximum
        max_community = field.get("maxCommunity")
        if max_community is not None:
            current = result.get(key)
            if isinstance(current, (int, float)):
                result[key] = min(current, max_community)
    return result


@router.post("/dashboard")
async def save_dashboard(request: Request, db: DBSession = Depends(get_db)):
    body = await request.json()

    # Enforce community config limits: reset Pro fields when no valid license
    has_license = is_pro(db)
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
