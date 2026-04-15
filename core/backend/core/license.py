"""License validation, heartbeat, and status logic."""
import json
import httpx
from datetime import datetime, UTC, timedelta
from sqlalchemy.orm import Session

LICENSE_API_BASE = "https://license.gitvise.dev/api"
FALLBACK_TOLERANCE_DAYS = 7

# Config keys used for license state
_KEY_LICENSE_KEY = "license_key"
_KEY_LICENSE_STATUS = "license_status"
_KEY_LICENSE_VALIDATED_AT = "license_validated_at"


async def validate_key(key: str) -> dict:
    """Call the license server to validate a key.

    Returns a dict with at least ``valid: bool``.  On network errors the
    ``reason`` field is set to ``"network_error"`` so callers can distinguish
    a hard rejection from a temporary outage.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{LICENSE_API_BASE}/validate",
                json={"key": key},
                headers={"Accept": "application/json"},
            )
        if resp.status_code == 200:
            return resp.json()
        return {"valid": False, "reason": "server_error"}
    except httpx.RequestError:
        return {"valid": False, "reason": "network_error"}


async def send_heartbeat(key: str) -> bool:
    """Send daily heartbeat to the license server.

    Returns True if the server acknowledged the heartbeat.  A False return
    does *not* immediately invalidate the license – the 7-day tolerance window
    absorbs transient outages.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{LICENSE_API_BASE}/heartbeat",
                json={"key": key},
                headers={"Accept": "application/json"},
            )
        return resp.status_code == 200
    except httpx.RequestError:
        return False


def get_license_status(db: Session) -> dict:
    """Return the current license status with 7-day offline tolerance.

    Shape of the returned dict::

        {
            "valid": bool,
            "tier": "community" | "pro",
            "email": str | None,
            "expiresAt": str | None,   # ISO-8601
            "offline": bool,           # True when using cached status
            "reason": str | None,      # Only present when not valid
        }
    """
    from api.setup import _get_config  # late import – avoids circular dependency

    key = _get_config(db, _KEY_LICENSE_KEY)
    if not key:
        return {"valid": False, "tier": "community", "reason": "no_key"}

    status_json = _get_config(db, _KEY_LICENSE_STATUS)
    validated_at_str = _get_config(db, _KEY_LICENSE_VALIDATED_AT)

    if status_json and validated_at_str:
        try:
            stored = json.loads(status_json)
            validated_at = datetime.fromisoformat(validated_at_str)
            age_days = (datetime.now(UTC) - validated_at).days

            if stored.get("valid"):
                if age_days <= FALLBACK_TOLERANCE_DAYS:
                    return {**stored, "offline": age_days > 0}
                # Tolerance window exceeded
                return {
                    "valid": False,
                    "tier": "community",
                    "reason": "validation_expired",
                }
        except (json.JSONDecodeError, ValueError):
            pass  # corrupted entry – fall through

    # Key present but validation result missing or corrupt
    return {"valid": False, "tier": "community", "reason": "not_validated", "hasKey": True}


def is_pro(db: Session) -> bool:
    """Return True if the current license grants Pro access."""
    status = get_license_status(db)
    return bool(status.get("valid") and status.get("tier") == "pro")


def store_validation_result(db: Session, result: dict) -> None:
    """Persist a successful validation response to the database."""
    from api.setup import _set_config  # late import

    _set_config(db, _KEY_LICENSE_STATUS, json.dumps(result))
    _set_config(db, _KEY_LICENSE_VALIDATED_AT, datetime.now(UTC).isoformat())


def clear_license(db: Session) -> None:
    """Remove the license key and all associated state from the database."""
    from sqlalchemy import delete as sa_delete
    from models.settings import AppConfig

    for k in [_KEY_LICENSE_KEY, _KEY_LICENSE_STATUS, _KEY_LICENSE_VALIDATED_AT]:
        db.execute(sa_delete(AppConfig).where(AppConfig.key == k))
