"""CI/CD & Actions sync – fetches recent workflow runs for each synced repository."""
import asyncio
from datetime import datetime, timezone, timedelta

import httpx

from core.db import SessionLocal
from models.workflow_run import WorkflowRun
from models.repo import Repository

GITHUB_API = "https://api.github.com"
# Fetch runs from the last 30 days; older data is purged on each sync.
LOOKBACK_DAYS = 30


async def _gh(client: httpx.AsyncClient, token: str, path: str):
    try:
        resp = await client.get(
            f"{GITHUB_API}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if resp.status_code in (403, 404):
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError:
        return None


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.rstrip("Z")).replace(tzinfo=timezone.utc)


def _duration(started: datetime | None, updated: datetime | None) -> int | None:
    if not started or not updated:
        return None
    s = started if started.tzinfo else started.replace(tzinfo=timezone.utc)
    u = updated if updated.tzinfo else updated.replace(tzinfo=timezone.utc)
    secs = int((u - s).total_seconds())
    return max(secs, 0)


async def run() -> None:
    """Entry point called by SyncEngine."""
    db = SessionLocal()
    try:
        from api.setup import _get_config

        token = _get_config(db, "github_token")
        if not token:
            print("[ci-cd] No token configured, skipping sync")
            return

        repos = db.query(Repository).all()
        if not repos:
            print("[ci-cd] No repos synced yet, skipping")
            return

        since = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        synced_at = datetime.now(timezone.utc)
        total_runs = 0

        print(f"[ci-cd] Syncing workflow runs for {len(repos)} repos (last {LOOKBACK_DAYS}d)")

        async with httpx.AsyncClient(timeout=30) as client:
            for repo in repos:
                full_name = repo.full_name

                data = await _gh(
                    client, token,
                    f"/repos/{full_name}/actions/runs?per_page=100&created=>={since}"
                )
                if not isinstance(data, dict):
                    await asyncio.sleep(0.05)
                    continue

                runs = data.get("workflow_runs", [])

                # Replace all runs for this repo within the lookback window
                db.query(WorkflowRun).filter_by(repo_full_name=full_name).delete()

                for r in runs:
                    started = _parse_dt(r.get("run_started_at"))
                    updated = _parse_dt(r.get("updated_at"))
                    db.add(WorkflowRun(
                        repo_full_name=full_name,
                        run_id=r["id"],
                        workflow_name=r.get("name", ""),
                        workflow_id=r.get("workflow_id", 0),
                        branch=r.get("head_branch"),
                        status=r.get("status", ""),
                        conclusion=r.get("conclusion"),
                        event=r.get("event"),
                        created_at=_parse_dt(r.get("created_at")),
                        updated_at=updated,
                        run_started_at=started,
                        duration_seconds=_duration(started, updated) if r.get("status") == "completed" else None,
                        synced_at=synced_at,
                    ))
                    total_runs += 1

                await asyncio.sleep(0.05)

            db.commit()
            print(f"[ci-cd] Sync complete: {total_runs} workflow runs across {len(repos)} repos")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
