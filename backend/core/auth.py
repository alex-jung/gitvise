"""Auth helpers – password hashing, session management, brute-force protection."""
import base64
import hashlib
import hmac
import os
import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from core.db import SessionLocal
from models.session import Session

SESSION_COOKIE = "gitvise_session"
SESSION_DURATION_DAYS = 30
MAX_ATTEMPTS = 10
BLOCK_MINUTES = 15

# Public paths that bypass auth middleware
PUBLIC_PATHS = {
    "/api/core/auth/login",
    "/api/core/auth/status",
    "/api/core/auth/set-password",
    "/api/core/setup/status",
    "/api/core/setup/test-connection",
    "/api/core/setup",
    "/health",
}

# In-memory brute-force state: ip -> (fail_count, blocked_until)
_brute_force: dict[str, tuple[int, datetime]] = defaultdict(
    lambda: (0, datetime.min.replace(tzinfo=timezone.utc))
)


# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 with random salt, stored as 'salt_b64:key_b64'."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(key).decode()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, key_b64 = stored.split(":", 1)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(key_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
        return hmac.compare_digest(expected, actual)
    except Exception:
        return False


# ── Session Management ────────────────────────────────────────────────────────

def create_session(db: DBSession) -> str:
    token = secrets.token_hex(32)
    now = datetime.now(timezone.utc)
    db.add(Session(
        token=token,
        created_at=now,
        expires_at=now + timedelta(days=SESSION_DURATION_DAYS),
    ))
    db.commit()
    return token


def validate_session(db: DBSession, token: str) -> bool:
    if not token:
        return False
    row = db.execute(
        select(Session).where(Session.token == token)
    ).scalar_one_or_none()
    if row is None:
        return False
    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        return False
    return True


def delete_session(db: DBSession, token: str) -> None:
    db.execute(delete(Session).where(Session.token == token))
    db.commit()


# ── Brute-Force Protection ────────────────────────────────────────────────────

def is_blocked(ip: str) -> bool:
    count, blocked_until = _brute_force[ip]
    return count >= MAX_ATTEMPTS and datetime.now(timezone.utc) < blocked_until


def record_failure(ip: str) -> None:
    count, _ = _brute_force[ip]
    count += 1
    blocked_until = (
        datetime.now(timezone.utc) + timedelta(minutes=BLOCK_MINUTES)
        if count >= MAX_ATTEMPTS
        else datetime.min.replace(tzinfo=timezone.utc)
    )
    _brute_force[ip] = (count, blocked_until)


def clear_failures(ip: str) -> None:
    _brute_force.pop(ip, None)


# ── Middleware ────────────────────────────────────────────────────────────────

async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path in PUBLIC_PATHS:
        return await call_next(request)

    token = request.cookies.get(SESSION_COOKIE, "")
    db = SessionLocal()
    try:
        valid = validate_session(db, token)
    finally:
        db.close()

    if not valid:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    return await call_next(request)
