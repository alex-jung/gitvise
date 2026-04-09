from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from core.db import get_db
from core.crypto import encrypt, decrypt
from models.settings import AppConfig

router = APIRouter(tags=["setup"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class TestConnectionRequest(BaseModel):
    token: str


class SetupRequest(BaseModel):
    github_token: str
    github_auth_type: str = "pat"  # pat | app
    github_org: str
    sync_interval_sec: int = 300
    license_key: str = ""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_config(db: Session, key: str) -> str | None:
    row = db.execute(select(AppConfig).where(AppConfig.key == key)).scalar_one_or_none()
    if row is None:
        return None
    return decrypt(row.value) if row.encrypted else row.value


def _set_config(db: Session, key: str, value: str, encrypted: bool = False) -> None:
    stored = encrypt(value) if encrypted else value
    existing = db.execute(select(AppConfig).where(AppConfig.key == key)).scalar_one_or_none()
    if existing:
        existing.value = stored
        existing.encrypted = encrypted
    else:
        db.add(AppConfig(key=key, value=stored, encrypted=encrypted))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/setup/status")
async def get_setup_status(db: Session = Depends(get_db)):
    """Returns whether the initial setup has been completed."""
    completed = _get_config(db, "setup_completed") == "true"
    return {"completed": completed}


@router.post("/setup/test-connection")
async def test_github_connection(body: TestConnectionRequest):
    """Validate a GitHub Personal Access Token."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {body.token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"GitHub API unreachable: {exc}")

    if resp.status_code == 401:
        return {"valid": False, "error": "Invalid or expired token"}
    if resp.status_code != 200:
        return {"valid": False, "error": f"GitHub returned {resp.status_code}"}

    user = resp.json()
    return {
        "valid": True,
        "login": user.get("login"),
        "name": user.get("name"),
        "avatarUrl": user.get("avatar_url"),
    }


@router.post("/setup")
async def complete_setup(body: SetupRequest, db: Session = Depends(get_db)):
    """Persist setup configuration and mark setup as completed."""
    # Only update token if a non-empty value is provided (allows settings-page partial save)
    if body.github_token:
        _set_config(db, "github_token", body.github_token, encrypted=True)
    _set_config(db, "github_auth_type", body.github_auth_type)
    _set_config(db, "github_org", body.github_org)
    _set_config(db, "sync_interval_sec", str(body.sync_interval_sec))

    if body.license_key:
        _set_config(db, "license_key", body.license_key, encrypted=True)

    _set_config(db, "setup_completed", "true")
    db.commit()

    # Update sync engine interval and trigger immediate sync
    import asyncio
    from main import app  # late import to avoid circular
    engine = getattr(app.state, "sync_engine", None)
    if engine:
        engine.set_interval(body.sync_interval_sec)
        asyncio.create_task(engine.trigger())

    return {"success": True}


@router.get("/setup/config")
async def get_config(db: Session = Depends(get_db)):
    """Return non-sensitive config values for the Settings UI."""
    return {
        "githubAuthType": _get_config(db, "github_auth_type"),
        "githubOrg": _get_config(db, "github_org"),
        "syncIntervalSec": int(_get_config(db, "sync_interval_sec") or 300),
        "hasLicenseKey": bool(_get_config(db, "license_key")),
        "setupCompleted": _get_config(db, "setup_completed") == "true",
    }
