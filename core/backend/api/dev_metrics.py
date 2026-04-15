"""Developer Metrics API."""
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.db import get_db
from models.commit import Commit
from models.pull_request import PullRequest

router = APIRouter(tags=["developer-metrics"])

BOT_SUFFIXES = ("[bot]", "-bot", "_bot")


def _is_bot(login: str | None) -> bool:
    if not login:
        return False
    return any(login.endswith(s) for s in BOT_SUFFIXES)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _cutoff(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _cycle_hours(pr: PullRequest) -> float | None:
    """Hours from PR creation to merge. Returns None if not merged or no timestamps."""
    created = _as_utc(pr.created_at)
    merged = _as_utc(pr.merged_at)
    if created is None or merged is None:
        return None
    delta = merged - created
    if delta.total_seconds() < 0:
        return None
    return delta.total_seconds() / 3600


def _merged_prs_in_window(prs: list[PullRequest], days: int) -> list[PullRequest]:
    cut = _cutoff(days)
    return [
        p for p in prs
        if p.state == "merged"
        and _as_utc(p.merged_at) is not None
        and _as_utc(p.merged_at) >= cut  # type: ignore[operator]
    ]


def _closed_prs_in_window(prs: list[PullRequest], days: int) -> list[PullRequest]:
    """Merged + non-merged closed PRs within window (for merge rate denominator)."""
    cut = _cutoff(days)
    result = []
    for p in prs:
        if p.state not in ("merged", "closed"):
            continue
        ref = _as_utc(p.merged_at) or _as_utc(p.closed_at)
        if ref and ref >= cut:
            result.append(p)
    return result


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/dev/summary")
def dev_summary(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=90),
):
    all_prs = db.execute(select(PullRequest)).scalars().all()
    all_commits = db.execute(select(Commit)).scalars().all()

    merged = _merged_prs_in_window(all_prs, days)
    closed = _closed_prs_in_window(all_prs, days)

    # Avg cycle time
    cycle_times = [h for p in merged if (h := _cycle_hours(p)) is not None]
    avg_cycle_hours = round(sum(cycle_times) / len(cycle_times), 1) if cycle_times else None

    # Merge rate
    merge_rate = round(len(merged) / len(closed) * 100) if closed else None

    # Top committer (within window)
    cut = _cutoff(days)
    commit_counter: Counter = Counter()
    for c in all_commits:
        if _as_utc(c.committed_at) and _as_utc(c.committed_at) >= cut and not _is_bot(c.author_login):  # type: ignore[operator]
            key = c.author_login or c.author_name or "unknown"
            commit_counter[key] += 1
    top_committer = commit_counter.most_common(1)[0][0] if commit_counter else None

    return {
        "avgCycleTimeHours": avg_cycle_hours,
        "mergeRate": merge_rate,
        "totalMerged": len(merged),
        "totalClosed": len(closed),
        "topCommitter": top_committer,
    }


# ── Cycle-time trend (per week) ───────────────────────────────────────────────

@router.get("/dev/cycle-time-trend")
def dev_cycle_time_trend(
    db: Session = Depends(get_db),
    weeks: int = Query(8, ge=4, le=12),
):
    all_prs = db.execute(select(PullRequest)).scalars().all()

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    days_since_monday = today.weekday()
    this_monday = today - timedelta(days=days_since_monday)
    week_start = this_monday - timedelta(weeks=weeks - 1)

    # Bucket merged PRs by the week they were merged
    buckets: dict[int, list[float]] = defaultdict(list)
    for pr in all_prs:
        if pr.state != "merged":
            continue
        merged = _as_utc(pr.merged_at)
        if merged is None or merged < week_start:
            continue
        hours = _cycle_hours(pr)
        if hours is None:
            continue
        delta = merged - week_start.replace(tzinfo=timezone.utc)
        week_idx = min(delta.days // 7, weeks - 1)
        buckets[week_idx].append(hours)

    result = []
    for w in range(weeks):
        ws = week_start + timedelta(weeks=w)
        label = ws.strftime("%m-%d")
        vals = buckets.get(w, [])
        avg = round(sum(vals) / len(vals), 1) if vals else None
        result.append({"week": label, "avgHours": avg})
    return result


# ── Developer leaderboard ─────────────────────────────────────────────────────

@router.get("/dev/leaderboard")
def dev_leaderboard(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=90),
    limit: int = Query(20, ge=5, le=100),
):
    all_prs = db.execute(select(PullRequest)).scalars().all()
    all_commits = db.execute(select(Commit)).scalars().all()
    cut = _cutoff(days)

    # Commits per author in window
    commit_count: Counter = Counter()
    display_name: dict[str, str] = {}
    for c in all_commits:
        if not (_as_utc(c.committed_at) and _as_utc(c.committed_at) >= cut):  # type: ignore[operator]
            continue
        if _is_bot(c.author_login):
            continue
        key = c.author_login or c.author_name or "unknown"
        commit_count[key] += 1
        if key not in display_name:
            display_name[key] = c.author_name or key

    # PRs opened in window per author
    prs_opened: Counter = Counter()
    prs_merged: Counter = Counter()
    cycle_times_by_dev: dict[str, list[float]] = defaultdict(list)

    for pr in all_prs:
        login = pr.author_login or "unknown"
        if _is_bot(login):
            continue

        created = _as_utc(pr.created_at)
        if created and created >= cut:
            prs_opened[login] += 1
            if login not in display_name:
                display_name[login] = login

        if pr.state == "merged":
            merged = _as_utc(pr.merged_at)
            if merged and merged >= cut:
                prs_merged[login] += 1
                h = _cycle_hours(pr)
                if h is not None:
                    cycle_times_by_dev[login].append(h)

    # Union of all known authors
    all_authors = set(commit_count) | set(prs_opened) | set(prs_merged)

    rows = []
    for login in all_authors:
        cycles = cycle_times_by_dev.get(login, [])
        avg_cycle = round(sum(cycles) / len(cycles), 1) if cycles else None
        rows.append({
            "login": login,
            "displayName": display_name.get(login, login),
            "commits": commit_count.get(login, 0),
            "prsOpened": prs_opened.get(login, 0),
            "prsMerged": prs_merged.get(login, 0),
            "avgCycleTimeHours": avg_cycle,
        })

    # Sort by commits desc, then prsMerged desc
    rows.sort(key=lambda r: (-r["commits"], -r["prsMerged"]))
    return rows[:limit]
