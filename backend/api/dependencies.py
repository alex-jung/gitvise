"""Dependencies & Security API."""
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.helpers import as_utc
from core.db import get_db
from models.dependabot_alert import DependabotAlert
from models.repo import Repository

router = APIRouter(tags=["dependencies"])

SEVERITY_WEIGHT = {"critical": 25, "high": 10, "medium": 3, "low": 1}


def _security_score(critical: int, high: int, medium: int, low: int) -> int:
    """Compute a 0–100 score. 100 = no vulnerabilities."""
    penalty = critical * 25 + high * 10 + medium * 3 + low * 1
    return max(0, 100 - penalty)


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/deps/summary")
def deps_summary(db: Session = Depends(get_db)):
    alerts = db.execute(
        select(DependabotAlert).where(DependabotAlert.state == "open")
    ).scalars().all()

    by_sev: Counter = Counter(a.severity for a in alerts)
    critical = by_sev.get("critical", 0)
    high = by_sev.get("high", 0)
    medium = by_sev.get("medium", 0)
    low = by_sev.get("low", 0)

    affected = len(set(a.repo_full_name for a in alerts))
    score = _security_score(critical, high, medium, low)

    last_sync_dt = max((as_utc(a.synced_at) for a in alerts if a.synced_at), default=None)
    last_sync = last_sync_dt.isoformat() if last_sync_dt else None

    return {
        "total": len(alerts),
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "affectedRepos": affected,
        "securityScore": score,
        "lastSyncedAt": last_sync,
    }


# ── Alerts list ───────────────────────────────────────────────────────────────

@router.get("/deps/alerts")
def deps_alerts(
    db: Session = Depends(get_db),
    limit: int = Query(200, ge=1, le=1000),
):
    alerts = db.execute(
        select(DependabotAlert).where(DependabotAlert.state == "open")
    ).scalars().all()

    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts_sorted = sorted(alerts, key=lambda a: sev_order.get(a.severity, 9))

    return [
        {
            "repoFullName": a.repo_full_name,
            "alertNumber": a.alert_number,
            "packageName": a.package_name,
            "ecosystem": a.ecosystem,
            "severity": a.severity,
            "summary": a.summary,
            "cveId": a.cve_id,
            "createdAt": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alerts_sorted[:limit]
    ]


# ── By severity ───────────────────────────────────────────────────────────────

@router.get("/deps/by-severity")
def deps_by_severity(db: Session = Depends(get_db)):
    alerts = db.execute(
        select(DependabotAlert).where(DependabotAlert.state == "open")
    ).scalars().all()
    counter: Counter = Counter(a.severity for a in alerts)
    order = ["critical", "high", "medium", "low"]
    return [{"severity": sev, "count": counter.get(sev, 0)} for sev in order]


# ── Affected repos ────────────────────────────────────────────────────────────

@router.get("/deps/affected-repos")
def deps_affected_repos(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    alerts = db.execute(
        select(DependabotAlert).where(DependabotAlert.state == "open")
    ).scalars().all()

    repo_counts: Counter = Counter()
    repo_sev: dict[str, Counter] = {}
    for a in alerts:
        repo_counts[a.repo_full_name] += 1
        if a.repo_full_name not in repo_sev:
            repo_sev[a.repo_full_name] = Counter()
        repo_sev[a.repo_full_name][a.severity] += 1

    result = []
    for repo, total in repo_counts.most_common(limit):
        sev = repo_sev[repo]
        result.append({
            "repoFullName": repo,
            "total": total,
            "critical": sev.get("critical", 0),
            "high": sev.get("high", 0),
            "medium": sev.get("medium", 0),
            "low": sev.get("low", 0),
        })
    return result


# ── License overview (from repos table) ──────────────────────────────────────

@router.get("/deps/licenses")
def deps_licenses(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=3, le=30),
):
    repos = db.execute(select(Repository)).scalars().all()
    counter: Counter = Counter()
    no_license = 0
    for r in repos:
        if r.has_license:
            # We only have a boolean, not the license name.
            # Use the language field as a proxy grouping key is wrong.
            # Mark as "Licensed" – detailed license names require extra API calls.
            counter["Licensed"] += 1
        else:
            no_license += 1

    result = [{"license": k, "count": v} for k, v in counter.most_common(limit)]
    if no_license:
        result.append({"license": "No license", "count": no_license})
    return result
