from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx
import json

from core.auth import SESSION_COOKIE, SESSION_DURATION_DAYS, create_session
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


class SwitchOrgRequest(BaseModel):
    org: str


class AddOrgRequest(BaseModel):
    org: str


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
    """Returns whether the initial setup has been completed and if a password is set."""
    completed = _get_config(db, "setup_completed") == "true"
    has_password = bool(_get_config(db, "admin_password_hash"))
    return {"completed": completed, "hasPassword": has_password}


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
async def complete_setup(body: SetupRequest, response: Response, db: Session = Depends(get_db)):
    """Persist setup configuration and mark setup as completed."""
    # Only update token if a non-empty value is provided (allows settings-page partial save)
    if body.github_token:
        _set_config(db, "github_token", body.github_token, encrypted=True)
    _set_config(db, "github_auth_type", body.github_auth_type)
    _set_config(db, "github_org", body.github_org)
    _set_config(db, "sync_interval_sec", str(body.sync_interval_sec))

    if body.license_key:
        from core.license import validate_key, store_validation_result
        result = await validate_key(body.license_key)
        if result.get("valid"):
            _set_config(db, "license_key", body.license_key, encrypted=True)
            store_validation_result(db, result)
        # Store the key even on network errors so it can be re-validated later
        elif result.get("reason") == "network_error":
            _set_config(db, "license_key", body.license_key, encrypted=True)

    _set_config(db, "setup_completed", "true")
    db.commit()

    # Create auth session so the user lands on /overview without needing to log in
    token = create_session(db)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="strict",
        max_age=SESSION_DURATION_DAYS * 86400,
        secure=False,  # set True behind HTTPS
    )

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
    from core.license import get_license_status
    license_status = get_license_status(db)
    active_org = _get_config(db, "github_org") or ""
    orgs_raw = _get_config(db, "github_orgs")
    orgs: list[str] = json.loads(orgs_raw) if orgs_raw else []
    # Ensure active org is always in the list
    if active_org and active_org not in orgs:
        orgs = [active_org] + orgs
    return {
        "githubAuthType": _get_config(db, "github_auth_type"),
        "githubOrg": active_org,
        "githubOrgs": orgs,
        "syncIntervalSec": int(_get_config(db, "sync_interval_sec") or 300),
        "hasLicenseKey": bool(_get_config(db, "license_key")),
        "licenseStatus": license_status,
        "setupCompleted": _get_config(db, "setup_completed") == "true",
    }


@router.post("/setup/switch-org")
async def switch_org(body: SwitchOrgRequest, db: Session = Depends(get_db)):
    """Switch the active GitHub org/user and trigger an immediate sync."""
    org = body.org.strip()
    if not org:
        raise HTTPException(status_code=400, detail="org must not be empty")

    # Ensure the org is in the saved list
    orgs_raw = _get_config(db, "github_orgs")
    orgs: list[str] = json.loads(orgs_raw) if orgs_raw else []
    if org not in orgs:
        orgs.insert(0, org)
    _set_config(db, "github_orgs", json.dumps(orgs))
    _set_config(db, "github_org", org)
    db.commit()

    import asyncio
    from main import app
    engine = getattr(app.state, "sync_engine", None)
    if engine:
        asyncio.create_task(engine.trigger())

    return {"success": True, "activeOrg": org}


@router.post("/setup/orgs")
async def add_org(body: AddOrgRequest, db: Session = Depends(get_db)):
    """Add an org/user to the saved list without switching to it."""
    org = body.org.strip()
    if not org:
        raise HTTPException(status_code=400, detail="org must not be empty")

    orgs_raw = _get_config(db, "github_orgs")
    orgs: list[str] = json.loads(orgs_raw) if orgs_raw else []

    # Also include currently active org if not yet in the list
    active_org = _get_config(db, "github_org") or ""
    if active_org and active_org not in orgs:
        orgs = [active_org] + orgs

    if org in orgs:
        return {"success": True, "orgs": orgs}

    orgs.append(org)
    _set_config(db, "github_orgs", json.dumps(orgs))
    db.commit()
    return {"success": True, "orgs": orgs}


@router.delete("/setup/orgs/{org}")
async def remove_org(org: str, db: Session = Depends(get_db)):
    """Remove an org/user from the saved list."""
    orgs_raw = _get_config(db, "github_orgs")
    orgs: list[str] = json.loads(orgs_raw) if orgs_raw else []

    active_org = _get_config(db, "github_org") or ""
    # Also ensure active org is in list before filtering
    if active_org and active_org not in orgs:
        orgs = [active_org] + orgs

    if org == active_org:
        raise HTTPException(status_code=400, detail="Cannot remove the currently active org")

    orgs = [o for o in orgs if o != org]
    _set_config(db, "github_orgs", json.dumps(orgs))
    db.commit()
    return {"success": True, "orgs": orgs}
