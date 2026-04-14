"""Pull Requests & Issues API."""
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.db import get_db
from models.pull_request import PullRequest
from models.issue import Issue

router = APIRouter(tags=["pull-requests"])


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _age_days(created_at: datetime | None) -> int:
    if not created_at:
        return 0
    return (datetime.now(timezone.utc) - _as_utc(created_at)).days


def _pr_to_dict(pr: PullRequest) -> dict:
    return {
        "repoFullName": pr.repo_full_name,
        "number": pr.number,
        "title": pr.title,
        "isDraft": pr.is_draft,
        "author": pr.author_login,
        "labels": pr.labels,
        "ageDays": _age_days(pr.created_at),
        "createdAt": pr.created_at.isoformat() if pr.created_at else None,
        "updatedAt": pr.updated_at.isoformat() if pr.updated_at else None,
    }


# ── PR endpoints ──────────────────────────────────────────────────────────────

@router.get("/prs/summary")
def prs_summary(db: Session = Depends(get_db)):
    prs = db.execute(select(PullRequest).where(PullRequest.state == "open")).scalars().all()
    if not prs:
        return {
            "open": 0,
            "drafts": 0,
            "ready": 0,
            "avgAgeDays": 0,
            "staleCount": 0,
            "lastSyncedAt": None,
        }

    now = datetime.now(timezone.utc)
    ages = [_age_days(pr.created_at) for pr in prs]
    avg_age = round(sum(ages) / len(ages)) if ages else 0
    drafts = sum(1 for pr in prs if pr.is_draft)
    stale = sum(1 for pr in prs if _age_days(pr.created_at) >= 7)
    last_sync = max((_as_utc(pr.synced_at) for pr in prs if pr.synced_at), default=None)

    return {
        "open": len(prs),
        "drafts": drafts,
        "ready": len(prs) - drafts,
        "avgAgeDays": avg_age,
        "staleCount": stale,
        "lastSyncedAt": last_sync.isoformat() if last_sync else None,
    }


@router.get("/prs/age-distribution")
def prs_age_distribution(db: Session = Depends(get_db)):
    prs = db.execute(select(PullRequest).where(PullRequest.state == "open")).scalars().all()
    buckets = {"< 1 day": 0, "1–7 days": 0, "7–30 days": 0, "> 30 days": 0}
    for pr in prs:
        age = _age_days(pr.created_at)
        if age < 1:
            buckets["< 1 day"] += 1
        elif age < 7:
            buckets["1–7 days"] += 1
        elif age < 30:
            buckets["7–30 days"] += 1
        else:
            buckets["> 30 days"] += 1
    return [{"label": k, "count": v} for k, v in buckets.items()]


@router.get("/prs/list")
def prs_list(
    db: Session = Depends(get_db),
    stale_days: int = Query(7, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    prs = db.execute(select(PullRequest).where(PullRequest.state == "open")).scalars().all()
    result = [_pr_to_dict(pr) for pr in prs if _age_days(pr.created_at) >= stale_days]
    result.sort(key=lambda p: p["ageDays"], reverse=True)
    return result[:limit]


# ── Issue endpoints ───────────────────────────────────────────────────────────

@router.get("/issues/summary")
def issues_summary(db: Session = Depends(get_db)):
    issues = db.execute(select(Issue).where(Issue.state == "open")).scalars().all()
    if not issues:
        return {
            "open": 0,
            "avgAgeDays": 0,
            "lastSyncedAt": None,
        }

    ages = [_age_days(i.created_at) for i in issues]
    avg_age = round(sum(ages) / len(ages)) if ages else 0
    last_sync = max((_as_utc(i.synced_at) for i in issues if i.synced_at), default=None)

    return {
        "open": len(issues),
        "avgAgeDays": avg_age,
        "lastSyncedAt": last_sync.isoformat() if last_sync else None,
    }


@router.get("/issues/by-label")
def issues_by_label(
    db: Session = Depends(get_db),
    limit: int = Query(8, ge=3, le=30),
):
    issues = db.execute(select(Issue).where(Issue.state == "open")).scalars().all()
    counter: Counter = Counter()
    unlabeled = 0
    for issue in issues:
        lbls = issue.labels
        if lbls:
            for lbl in lbls:
                counter[lbl] += 1
        else:
            unlabeled += 1

    result = [{"label": k, "count": v} for k, v in counter.most_common(limit)]
    if unlabeled:
        result.append({"label": "(no label)", "count": unlabeled})
    return result
