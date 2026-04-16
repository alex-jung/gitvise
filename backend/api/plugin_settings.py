"""Generic plugin settings API.

Stores arbitrary JSON settings per plugin in AppConfig under the key
`plugin_settings_{plugin_id}` (hyphens replaced with underscores).

Routes
------
GET  /api/core/plugin-settings/{plugin_id}   – return stored settings (or {})
POST /api/core/plugin-settings/{plugin_id}   – overwrite settings
"""
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.setup import _get_config, _set_config
from core.db import get_db

router = APIRouter(tags=["plugin-settings"])


def _cfg_key(plugin_id: str) -> str:
    safe = plugin_id.replace("-", "_").replace("/", "_")
    return f"plugin_settings_{safe}"


@router.get("/plugin-settings/{plugin_id}")
def get_plugin_settings(plugin_id: str, db: Session = Depends(get_db)):
    """Return stored settings dict for the given plugin (empty dict if none)."""
    raw = _get_config(db, _cfg_key(plugin_id))
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {}


@router.post("/plugin-settings/{plugin_id}")
def save_plugin_settings(plugin_id: str, body: dict, db: Session = Depends(get_db)):
    """Overwrite plugin settings."""
    _set_config(db, _cfg_key(plugin_id), json.dumps(body))
    db.commit()
    return {"success": True}
