"""Alerts & Notifications API.

Aggregates critical events from existing plugin data and provides endpoints
for alert summaries, notification settings and webhook delivery.
"""
import json
import httpx
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.helpers import as_utc, cutoff
from api.setup import _get_config, _set_config
from core.db import get_db
from models.dependabot_alert import DependabotAlert
from models.pull_request import PullRequest
from models.workflow_run import WorkflowRun
from models.repo import Repository

router = APIRouter(tags=["alerts"])

_SETTINGS_KEY = "plugin_settings_alerts"


def _load_settings(db: Session) -> dict:
    raw = _get_config(db, _SETTINGS_KEY)
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {
        "stale_threshold_days": 30,
        "pr_stale_days": 14,
        "webhook_url": "",
        "webhook_enabled": False,
        "email_enabled": False,
        "email_digest_hour": 8,
    }


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/alerts/summary")
def alerts_summary(db: Session = Depends(get_db)):
    """Aggregate alert counts from all plugin data sources."""
    settings = _load_settings(db)
    stale_days = settings.get("stale_threshold_days", 30)
    pr_stale_days = settings.get("pr_stale_days", 14)

    # Critical Dependabot alerts
    all_alerts = db.execute(select(DependabotAlert)).scalars().all()
    critical_vulns = sum(
        1 for a in all_alerts
        if a.state == "open" and a.severity in ("critical", "high")
    )

    # Stale repos
    repos = db.execute(select(Repository)).scalars().all()
    stale_cutoff = cutoff(stale_days)
    stale_repos = sum(
        1 for r in repos
        if not r.is_archived
        and (
            r.pushed_at is None
            or as_utc(r.pushed_at) < stale_cutoff
        )
    )

    # Failing CI workflows (last 7 days, any failure)
    all_runs = db.execute(select(WorkflowRun)).scalars().all()
    ci_cutoff = cutoff(7)
    failing_workflows: set[str] = set()
    for r in all_runs:
        if (
            r.conclusion == "failure"
            and r.created_at
            and as_utc(r.created_at) >= ci_cutoff
        ):
            failing_workflows.add(f"{r.repo_full_name}/{r.workflow_name}")

    # Stale PRs
    all_prs = db.execute(select(PullRequest)).scalars().all()
    pr_cutoff = cutoff(pr_stale_days)
    stale_prs = sum(
        1 for p in all_prs
        if p.state == "open"
        and p.created_at
        and as_utc(p.created_at) < pr_cutoff
    )

    total = critical_vulns + stale_repos + len(failing_workflows) + stale_prs
    level = "ok" if total == 0 else ("warning" if total < 5 else "critical")

    return {
        "total": total,
        "level": level,
        "criticalVulns": critical_vulns,
        "staleRepos": stale_repos,
        "failingWorkflows": len(failing_workflows),
        "stalePrs": stale_prs,
    }


# ── Notification Settings ─────────────────────────────────────────────────────

class NotificationSettings(BaseModel):
    stale_threshold_days: int = 30
    pr_stale_days: int = 14
    webhook_url: str = ""
    webhook_enabled: bool = False
    email_enabled: bool = False
    email_digest_hour: int = 8


@router.get("/alerts/settings")
def get_alert_settings(db: Session = Depends(get_db)):
    return _load_settings(db)


@router.post("/alerts/settings")
def save_alert_settings(body: NotificationSettings, db: Session = Depends(get_db)):
    _set_config(db, _SETTINGS_KEY, json.dumps(body.model_dump()))
    db.commit()
    return {"success": True}


# ── Webhook test ──────────────────────────────────────────────────────────────

@router.post("/alerts/webhook/test")
async def test_webhook(db: Session = Depends(get_db)):
    """Send a test payload to the configured webhook URL."""
    settings = _load_settings(db)
    url = settings.get("webhook_url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="No webhook URL configured")

    payload = {
        "text": "[Gitvise] Test notification – webhook is working correctly.",
        "source": "gitvise",
        "type": "test",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Webhook returned {resp.status_code}",
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Request failed: {exc}")

    return {"success": True, "statusCode": resp.status_code}


# ── Webhook delivery (called from sync engine post-sync) ──────────────────────

async def maybe_send_webhook(db: Session) -> None:
    """If webhooks are enabled and there are active alerts, POST to the webhook URL."""
    settings = _load_settings(db)
    if not settings.get("webhook_enabled") or not settings.get("webhook_url", "").strip():
        return

    # Build summary inline to avoid circular imports with the route handler
    from sqlalchemy import select as sa_select

    all_alerts = db.execute(sa_select(DependabotAlert)).scalars().all()
    critical_vulns = sum(1 for a in all_alerts if a.state == "open" and a.severity in ("critical", "high"))

    if critical_vulns == 0:
        return  # Only fire when there is something to report

    payload = {
        "text": f"[Gitvise] {critical_vulns} critical/high vulnerabilities detected.",
        "source": "gitvise",
        "type": "alert",
        "criticalVulns": critical_vulns,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(settings["webhook_url"], json=payload)
    except Exception:
        pass  # Best-effort delivery; do not crash the sync
