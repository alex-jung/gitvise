import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from api.setup import _get_config, _set_config
from core.auth import (
    SESSION_COOKIE, SESSION_DURATION_DAYS,
    clear_failures, create_session, delete_session,
    hash_password, is_blocked, record_failure, verify_password,
)
from core.db import get_db

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class SetPasswordRequest(BaseModel):
    password: str


@router.get("/auth/status")
async def auth_status(db: DBSession = Depends(get_db)):
    """Returns whether an admin password has been configured (needed by setup)."""
    has_password = bool(_get_config(db, "admin_password_hash"))
    return {"hasPassword": has_password}


@router.post("/auth/set-password")
async def set_password(body: SetPasswordRequest, db: DBSession = Depends(get_db)):
    """Set the admin password during initial setup."""
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    _set_config(db, "admin_password_hash", hash_password(body.password), encrypted=False)
    db.commit()
    return {"success": True}


@router.post("/auth/login")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
):
    ip = (request.client.host or "unknown") if request.client else "unknown"

    if is_blocked(ip):
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Try again in 15 minutes.",
        )

    # 500 ms artificial delay to slow brute-force attempts
    await asyncio.sleep(0.5)

    password_hash = _get_config(db, "admin_password_hash")
    if not password_hash or not verify_password(body.password, password_hash):
        record_failure(ip)
        raise HTTPException(status_code=401, detail="Invalid password")

    clear_failures(ip)
    token = create_session(db)

    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="strict",
        max_age=SESSION_DURATION_DAYS * 86400,
        secure=False,  # set True behind HTTPS
    )
    return {"success": True}


@router.post("/auth/logout")
async def logout(request: Request, response: Response, db: DBSession = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE, "")
    if token:
        delete_session(db, token)
    response.delete_cookie(SESSION_COOKIE)
    return {"success": True}
