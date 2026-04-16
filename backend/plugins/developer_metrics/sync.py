"""Developer Metrics sync – fetches merged/closed PRs to enable cycle-time analytics."""
import asyncio
from datetime import datetime, timezone, timedelta

import httpx

from core.db import SessionLocal
from models.pull_request import PullRequest
from models.repo import Repository

GITHUB_API = "https://api.github.com"
LOOKBACK_DAYS = 90


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
            print("[developer-metrics] No token configured, skipping sync")
            return

        repos = db.query(Repository).filter_by(is_archived=False).all()
        if not repos:
            print("[developer-metrics] No repos synced yet, skipping")
            return

        since = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        synced_at = datetime.now(timezone.utc)
        total = 0

        print(f"[developer-metrics] Syncing merged PRs for {len(repos)} repos (last {LOOKBACK_DAYS}d)")

        async with httpx.AsyncClient(timeout=30) as client:
            for repo in repos:
                full_name = repo.full_name

                # Fetch closed PRs – GitHub returns both merged and unmerged closed PRs
                data = await _gh(
                    client, token,
                    f"/repos/{full_name}/pulls?state=closed&per_page=100&sort=updated&direction=desc"
                )
                if not isinstance(data, list):
                    await asyncio.sleep(0.05)
                    continue

                # Replace all closed/merged PR records for this repo
                db.query(PullRequest).filter(
                    PullRequest.repo_full_name == full_name,
                    PullRequest.state.in_(["closed", "merged"]),
                ).delete(synchronize_session=False)

                since_dt = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

                for pr in data:
                    merged_at = _parse_dt(pr.get("merged_at"))
                    closed_at = _parse_dt(pr.get("closed_at"))
                    created_at = _parse_dt(pr.get("created_at"))

                    # Only keep PRs closed within the lookback window
                    ref_dt = merged_at or closed_at
                    if ref_dt is None or ref_dt < since_dt:
                        continue

                    state = "merged" if merged_at else "closed"

                    db.add(PullRequest(
                        repo_full_name=full_name,
                        number=pr["number"],
                        title=pr.get("title", ""),
                        state=state,
                        is_draft=pr.get("draft", False),
                        author_login=(pr.get("user") or {}).get("login"),
                        labels_json="[]",
                        created_at=created_at,
                        updated_at=_parse_dt(pr.get("updated_at")),
                        merged_at=merged_at,
                        closed_at=closed_at,
                        synced_at=synced_at,
                    ))
                    total += 1

                await asyncio.sleep(0.05)

        db.commit()
        print(f"[developer-metrics] Sync complete: {total} closed/merged PRs across {len(repos)} repos")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
