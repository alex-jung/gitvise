"""Team & Activity API."""
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.helpers import as_utc, cutoff, is_bot
from core.config import COMMUNITY_MAX_DAYS, COMMUNITY_MAX_WEEKS
from core.db import get_db
from core.license import is_pro
from models.commit import Commit

router = APIRouter(tags=["team"])


def _filter(commits: list[Commit], days: int, exclude_bots: bool) -> list[Commit]:
    cut = cutoff(days)
    result = []
    for c in commits:
        if c.committed_at and as_utc(c.committed_at) < cut:
            continue
        if exclude_bots and is_bot(c.author_login):
            continue
        result.append(c)
    return result


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/team/summary")
def team_summary(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=365),
    exclude_bots: bool = Query(True),
):
    if not is_pro(db):
        days = min(days, COMMUNITY_MAX_DAYS)
    all_commits = db.execute(select(Commit)).scalars().all()
    commits = _filter(all_commits, days, exclude_bots)

    active_logins = {c.author_login for c in commits if c.author_login}

    # New contributors: first commit in the entire history (all_commits) is within window
    since = cutoff(days)
    first_commit: dict[str, datetime] = {}
    for c in all_commits:
        if not c.author_login or (is_bot(c.author_login) and exclude_bots):
            continue
        ts = as_utc(c.committed_at)
        if ts and (c.author_login not in first_commit or ts < first_commit[c.author_login]):
            first_commit[c.author_login] = ts

    new_contributors = sum(1 for ts in first_commit.values() if ts >= since)
    avg_per_day = round(len(commits) / days) if days > 0 else 0

    last_sync = max((as_utc(c.synced_at) for c in all_commits if c.synced_at), default=None)

    return {
        "activeContributors": len(active_logins),
        "totalCommits": len(commits),
        "newContributors": new_contributors,
        "avgCommitsPerDay": avg_per_day,
        "lastSyncedAt": last_sync.isoformat() if last_sync else None,
    }


# ── Contributors list ─────────────────────────────────────────────────────────

@router.get("/team/contributors")
def team_contributors(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=365),
    exclude_bots: bool = Query(True),
    limit: int = Query(20, ge=1, le=100),
):
    if not is_pro(db):
        days = min(days, COMMUNITY_MAX_DAYS)
    all_commits = db.execute(select(Commit)).scalars().all()
    commits = _filter(all_commits, days, exclude_bots)

    counter: Counter = Counter()
    display_name: dict[str, str] = {}
    for c in commits:
        key = c.author_login or c.author_name or "unknown"
        counter[key] += 1
        if key not in display_name:
            display_name[key] = c.author_name or key

    # First-commit date for all-time history
    since = cutoff(days)
    first_commit: dict[str, datetime] = {}
    for c in all_commits:
        key = c.author_login or c.author_name or "unknown"
        if is_bot(c.author_login) and exclude_bots:
            continue
        ts = as_utc(c.committed_at)
        if ts and (key not in first_commit or ts < first_commit[key]):
            first_commit[key] = ts

    result = []
    for login, count in counter.most_common(limit):
        first = first_commit.get(login)
        is_new = first is not None and first >= since
        result.append({
            "login": login,
            "displayName": display_name.get(login, login),
            "commits": count,
            "isNew": is_new,
            "firstCommitAt": first.isoformat() if first else None,
        })
    return result


# ── Commit activity by day ────────────────────────────────────────────────────

@router.get("/team/commit-activity")
def team_commit_activity(
    db: Session = Depends(get_db),
    days: int = Query(14, ge=7, le=365),
    exclude_bots: bool = Query(True),
):
    if not is_pro(db):
        days = min(days, COMMUNITY_MAX_DAYS)
    all_commits = db.execute(select(Commit)).scalars().all()
    commits = _filter(all_commits, days, exclude_bots)

    by_day: Counter = Counter()
    for c in commits:
        if c.committed_at:
            day = as_utc(c.committed_at).strftime("%m-%d")
            by_day[day] += 1

    now = datetime.now(timezone.utc)
    result = []
    for i in range(days, 0, -1):
        day = (now - timedelta(days=i)).strftime("%m-%d")
        result.append({"date": day, "commits": by_day.get(day, 0)})
    return result


# ── Activity heatmap (day-of-week × week) ─────────────────────────────────────

@router.get("/team/heatmap")
def team_heatmap(
    db: Session = Depends(get_db),
    weeks: int = Query(12, ge=4, le=52),
    exclude_bots: bool = Query(True),
):
    if not is_pro(db):
        weeks = min(weeks, COMMUNITY_MAX_WEEKS)
    """
    Returns a 7-row × weeks-col matrix of commit counts.
    Row 0 = Monday, row 6 = Sunday.
    Col 0 = oldest week, col N-1 = most recent week.
    """
    all_commits = db.execute(select(Commit)).scalars().all()
    commits = _filter(all_commits, weeks * 7, exclude_bots)

    now = datetime.now(timezone.utc)
    # Determine the start of week 0 (Monday, weeks ago)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    days_since_monday = today.weekday()  # 0=Monday
    this_monday = today - timedelta(days=days_since_monday)
    week_start = this_monday - timedelta(weeks=weeks - 1)

    # 7 rows × weeks cols
    matrix = [[0] * weeks for _ in range(7)]
    col_labels = []
    for w in range(weeks):
        ws = week_start + timedelta(weeks=w)
        col_labels.append(ws.strftime("%m-%d"))

    for c in commits:
        ts = as_utc(c.committed_at)
        if not ts:
            continue
        delta = ts.replace(tzinfo=timezone.utc) - week_start.replace(tzinfo=timezone.utc)
        if delta.days < 0:
            continue
        week_idx = delta.days // 7
        day_idx = ts.weekday()  # 0=Mon, 6=Sun
        if 0 <= week_idx < weeks and 0 <= day_idx < 7:
            matrix[day_idx][week_idx] += 1

    return {
        "data": matrix,
        "colLabels": col_labels,
        "rowLabels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    }
