from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from core.db import get_db
from models.repo import Repository

router = APIRouter(tags=["repos"])

FILTER_VALUES = ["all", "stale", "critical", "unprotected", "archived"]
SORT_VALUES = ["health_asc", "health_desc", "name", "pushed_at"]


def _as_utc(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware (SQLite strips tzinfo on read-back)."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _repo_to_dict(r: Repository) -> dict:
    days_since_push = None
    pushed_at = _as_utc(r.pushed_at)
    if pushed_at:
        days_since_push = (datetime.now(timezone.utc) - pushed_at).days
    return {
        "fullName": r.full_name,
        "name": r.name,
        "owner": r.owner,
        "description": r.description,
        "language": r.language,
        "isPrivate": r.is_private,
        "isArchived": r.is_archived,
        "hasReadme": r.has_readme,
        "hasLicense": r.has_license,
        "hasBranchProtection": r.has_branch_protection,
        "defaultBranch": r.default_branch,
        "openIssuesCount": r.open_issues_count,
        "forksCount": r.forks_count,
        "stargazersCount": r.stargazers_count,
        "sizeKb": r.size_kb,
        "pushedAt": r.pushed_at.isoformat() if r.pushed_at else None,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "daysSincePush": days_since_push,
        "healthScore": r.health_score,
        "syncedAt": r.synced_at.isoformat() if r.synced_at else None,
    }


@router.get("/repos")
def list_repos(
    db: Session = Depends(get_db),
    filter: str = Query("all"),
    sort: str = Query("health_asc"),
):
    rows = db.execute(select(Repository)).scalars().all()
    repos = [_repo_to_dict(r) for r in rows]

    if filter == "stale":
        repos = [r for r in repos if (r["daysSincePush"] or 0) > 30 and not r["isArchived"]]
    elif filter == "critical":
        repos = [r for r in repos if r["healthScore"] < 40]
    elif filter == "unprotected":
        repos = [r for r in repos if not r["hasBranchProtection"] and not r["isArchived"]]
    elif filter == "archived":
        repos = [r for r in repos if r["isArchived"]]

    if sort == "health_asc":
        repos.sort(key=lambda r: r["healthScore"])
    elif sort == "health_desc":
        repos.sort(key=lambda r: r["healthScore"], reverse=True)
    elif sort == "name":
        repos.sort(key=lambda r: r["name"].lower())
    elif sort == "pushed_at":
        repos.sort(key=lambda r: r["pushedAt"] or "", reverse=True)

    return repos


@router.get("/repos/summary")
def repos_summary(db: Session = Depends(get_db)):
    rows = db.execute(select(Repository)).scalars().all()

    if not rows:
        return {
            "total": 0,
            "avgHealthScore": 0,
            "critical": 0,
            "stale": 0,
            "unprotected": 0,
            "lastSyncedAt": None,
        }

    now = datetime.now(timezone.utc)
    critical = sum(1 for r in rows if r.health_score < 40)
    stale = sum(
        1 for r in rows
        if r.pushed_at and (now - _as_utc(r.pushed_at)).days > 30 and not r.is_archived
    )
    unprotected = sum(1 for r in rows if not r.has_branch_protection and not r.is_archived)
    avg_score = round(sum(r.health_score for r in rows) / len(rows))
    last_sync = max((_as_utc(r.synced_at) for r in rows if r.synced_at), default=None)

    attention = sorted(
        [_repo_to_dict(r) for r in rows if r.health_score < 70],
        key=lambda r: r["healthScore"],
    )[:5]

    return {
        "total": len(rows),
        "avgHealthScore": avg_score,
        "critical": critical,
        "stale": stale,
        "unprotected": unprotected,
        "lastSyncedAt": last_sync.isoformat() if last_sync else None,
        "attentionRepos": attention,
    }
