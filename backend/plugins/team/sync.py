"""Team & Activity sync – fetches recent commits for each synced repository."""
import asyncio
from datetime import datetime, timezone, timedelta

import httpx

from core.db import SessionLocal
from models.commit import Commit
from models.repo import Repository

GITHUB_API = "https://api.github.com"
LOOKBACK_DAYS = 90  # store up to 90 days so the heatmap can show 12 weeks


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
            print("[team] No token configured, skipping sync")
            return

        repos = db.query(Repository).filter_by(is_archived=False).all()
        if not repos:
            print("[team] No repos synced yet, skipping")
            return

        since = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        synced_at = datetime.now(timezone.utc)
        total_commits = 0

        print(f"[team] Syncing commits for {len(repos)} repos (last {LOOKBACK_DAYS}d)")

        async with httpx.AsyncClient(timeout=30) as client:
            for repo in repos:
                full_name = repo.full_name

                # Fetch up to 100 recent commits (pagination omitted for MVP)
                data = await _gh(
                    client, token,
                    f"/repos/{full_name}/commits?per_page=100&since={since}"
                )
                if not isinstance(data, list):
                    await asyncio.sleep(0.05)
                    continue

                # Delete existing commits for this repo within the window, re-insert
                db.query(Commit).filter_by(repo_full_name=full_name).delete()

                for c in data:
                    author = c.get("author") or {}
                    commit_detail = c.get("commit", {})
                    author_detail = commit_detail.get("author", {})

                    # Prefer GitHub login; fall back to git author name
                    login = author.get("login") if author else None
                    name = author_detail.get("name")
                    committed_at = _parse_dt(author_detail.get("date"))

                    db.add(Commit(
                        repo_full_name=full_name,
                        sha=c["sha"],
                        author_login=login,
                        author_name=name,
                        committed_at=committed_at,
                        synced_at=synced_at,
                    ))
                    total_commits += 1

                await asyncio.sleep(0.05)

            db.commit()
            print(f"[team] Sync complete: {total_commits} commits across {len(repos)} repos")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
