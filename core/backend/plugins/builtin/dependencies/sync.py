"""Dependencies & Security sync – fetches Dependabot vulnerability alerts per repository."""
import asyncio
from datetime import datetime, timezone

import httpx

from core.db import SessionLocal
from models.dependabot_alert import DependabotAlert
from models.repo import Repository

GITHUB_API = "https://api.github.com"


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


async def run() -> None:
    """Entry point called by SyncEngine."""
    db = SessionLocal()
    try:
        from api.setup import _get_config

        token = _get_config(db, "github_token")
        if not token:
            print("[dependencies] No token configured, skipping sync")
            return

        repos = db.query(Repository).filter_by(is_archived=False).all()
        if not repos:
            print("[dependencies] No repos synced yet, skipping")
            return

        print(f"[dependencies] Syncing Dependabot alerts for {len(repos)} repos")
        synced_at = datetime.now(timezone.utc)
        total_alerts = 0

        async with httpx.AsyncClient(timeout=30) as client:
            for repo in repos:
                full_name = repo.full_name

                # Fetch open Dependabot alerts
                data = await _gh(
                    client, token,
                    f"/repos/{full_name}/dependabot/alerts?state=open&per_page=100"
                )
                if not isinstance(data, list):
                    await asyncio.sleep(0.05)
                    continue

                # Replace open alerts for this repo
                db.query(DependabotAlert).filter_by(
                    repo_full_name=full_name, state="open"
                ).delete()

                for alert in data:
                    sa = alert.get("security_advisory", {})
                    dep = alert.get("dependency", {})
                    pkg = dep.get("package", {})

                    db.add(DependabotAlert(
                        repo_full_name=full_name,
                        alert_number=alert["number"],
                        package_name=pkg.get("name", ""),
                        ecosystem=pkg.get("ecosystem"),
                        severity=sa.get("severity", "unknown"),
                        state=alert.get("state", "open"),
                        summary=sa.get("summary"),
                        cve_id=sa.get("cve_id"),
                        created_at=_parse_dt(alert.get("created_at")),
                        updated_at=_parse_dt(alert.get("updated_at")),
                        dismissed_at=_parse_dt(alert.get("dismissed_at")),
                        fixed_at=_parse_dt(alert.get("fixed_at")),
                        synced_at=synced_at,
                    ))
                    total_alerts += 1

                await asyncio.sleep(0.05)

            db.commit()
            print(f"[dependencies] Sync complete: {total_alerts} open alerts across {len(repos)} repos")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
