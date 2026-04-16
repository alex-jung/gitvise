"""License management API."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.db import get_db
from core.license import (
    validate_key,
    get_license_status,
    store_validation_result,
    clear_license,
)
from core.crypto import encrypt
from api.setup import _set_config

router = APIRouter(tags=["license"])


class ActivateLicenseRequest(BaseModel):
    key: str


@router.post("/license/validate")
async def activate_license(body: ActivateLicenseRequest, db: Session = Depends(get_db)):
    """Validate a license key against the license server and persist the result."""
    key = body.key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="License key is required")

    result = await validate_key(key)

    if result.get("valid"):
        # Store encrypted key and validation result
        _set_config(db, "license_key", key, encrypted=True)
        store_validation_result(db, result)
        db.commit()

    return result


@router.delete("/license")
async def remove_license(db: Session = Depends(get_db)):
    """Remove the active license key and reset to Community mode."""
    clear_license(db)
    db.commit()
    return {"success": True}


@router.get("/license/status")
async def license_status(db: Session = Depends(get_db)):
    """Return the current license status (with 7-day offline tolerance)."""
    return get_license_status(db)
