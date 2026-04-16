"""Shared utilities for API routers.

Centralises functions that were previously copy-pasted across multiple routers
to ensure consistency and single-point maintenance.
"""
from datetime import datetime, timezone, timedelta

BOT_SUFFIXES = ("[bot]", "-bot", "_bot")


def as_utc(dt: datetime | None) -> datetime | None:
    """Ensure a datetime is timezone-aware (SQLite strips tzinfo on read-back)."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def cutoff(days: int) -> datetime:
    """Return a timezone-aware datetime `days` ago from now."""
    return datetime.now(timezone.utc) - timedelta(days=days)


def is_bot(login: str | None) -> bool:
    """Return True if the GitHub login looks like a bot account."""
    if not login:
        return False
    return any(login.endswith(s) for s in BOT_SUFFIXES)
