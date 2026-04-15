"""CI/CD & Actions API."""
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.db import get_db
from core.license import is_pro
from models.workflow_run import WorkflowRun

_COMMUNITY_MAX_DAYS = 90

router = APIRouter(tags=["ci-cd"])


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _cutoff(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _recent(runs: list[WorkflowRun], days: int) -> list[WorkflowRun]:
    cut = _cutoff(days)
    return [r for r in runs if r.created_at and _as_utc(r.created_at) >= cut]


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/ci/summary")
def ci_summary(db: Session = Depends(get_db), days: int = Query(7, ge=1, le=365)):
    if not is_pro(db):
        days = min(days, _COMMUNITY_MAX_DAYS)
    all_runs = db.execute(select(WorkflowRun)).scalars().all()
    runs = _recent(all_runs, days)

    completed = [r for r in runs if r.status == "completed"]
    success = sum(1 for r in completed if r.conclusion == "success")
    failure = sum(1 for r in completed if r.conclusion == "failure")
    cancelled = sum(1 for r in completed if r.conclusion in ("cancelled", "timed_out", "skipped"))
    in_progress = sum(1 for r in runs if r.status == "in_progress")

    success_rate = round(success / len(completed) * 100) if completed else 0

    durations = [r.duration_seconds for r in completed if r.duration_seconds is not None]
    avg_duration = round(sum(durations) / len(durations)) if durations else 0

    last_sync = max((_as_utc(r.synced_at) for r in all_runs if r.synced_at), default=None)

    return {
        "total": len(runs),
        "success": success,
        "failure": failure,
        "cancelled": cancelled,
        "inProgress": in_progress,
        "successRate": success_rate,
        "avgDurationSeconds": avg_duration,
        "lastSyncedAt": last_sync.isoformat() if last_sync else None,
    }


# ── Failing workflows ─────────────────────────────────────────────────────────

@router.get("/ci/failing")
def ci_failing(db: Session = Depends(get_db), days: int = Query(7, ge=1, le=365)):
    if not is_pro(db):
        days = min(days, _COMMUNITY_MAX_DAYS)
    all_runs = db.execute(select(WorkflowRun)).scalars().all()
    runs = _recent(all_runs, days)

    # Group by repo + workflow_name, count failures vs total
    groups: dict[tuple[str, str], dict] = {}
    for r in runs:
        key = (r.repo_full_name, r.workflow_name)
        if key not in groups:
            groups[key] = {
                "repoFullName": r.repo_full_name,
                "workflowName": r.workflow_name,
                "total": 0,
                "failures": 0,
                "lastConclusion": None,
                "lastRunAt": None,
            }
        g = groups[key]
        g["total"] += 1
        if r.conclusion == "failure":
            g["failures"] += 1
        # Track most recent
        run_ts = _as_utc(r.created_at)
        if run_ts and (g["lastRunAt"] is None or run_ts.isoformat() > g["lastRunAt"]):
            g["lastRunAt"] = run_ts.isoformat()
            g["lastConclusion"] = r.conclusion

    # Return only workflows that had at least one failure, sorted by failure count
    failing = [g for g in groups.values() if g["failures"] > 0]
    failing.sort(key=lambda x: x["failures"], reverse=True)
    return failing


# ── Duration trend ────────────────────────────────────────────────────────────

@router.get("/ci/duration-trend")
def ci_duration_trend(db: Session = Depends(get_db), days: int = Query(14, ge=7, le=365)):
    if not is_pro(db):
        days = min(days, _COMMUNITY_MAX_DAYS)
    all_runs = db.execute(select(WorkflowRun)).scalars().all()
    runs = _recent(all_runs, days)

    # Bucket completed runs by UTC date
    by_day: dict[str, list[int]] = defaultdict(list)
    for r in runs:
        if r.status == "completed" and r.duration_seconds is not None and r.created_at:
            day = _as_utc(r.created_at).strftime("%m-%d")
            by_day[day].append(r.duration_seconds)

    # Build a full date range so the chart has no gaps
    result = []
    now = datetime.now(timezone.utc)
    for i in range(days, 0, -1):
        day = (now - timedelta(days=i)).strftime("%m-%d")
        vals = by_day.get(day, [])
        avg = round(sum(vals) / len(vals)) if vals else 0
        result.append({"date": day, "avgSeconds": avg})

    return result


# ── Run history ───────────────────────────────────────────────────────────────

@router.get("/ci/runs")
def ci_runs(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
):
    if not is_pro(db):
        days = min(days, _COMMUNITY_MAX_DAYS)
    all_runs = db.execute(select(WorkflowRun)).scalars().all()
    runs = _recent(all_runs, days)
    runs.sort(key=lambda r: (r.created_at or datetime.min).isoformat(), reverse=True)

    return [
        {
            "repoFullName": r.repo_full_name,
            "workflowName": r.workflow_name,
            "branch": r.branch,
            "status": r.status,
            "conclusion": r.conclusion,
            "event": r.event,
            "durationSeconds": r.duration_seconds,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        }
        for r in runs[:limit]
    ]
