"""Pull Requests & Issues sync – fetches open PRs and issues for each synced repository."""
import asyncio
import json
from datetime import datetime, timezone

import httpx

from core.db import SessionLocal
from models.pull_request import PullRequest
from models.issue import Issue
from models.repo import Repository

GITHUB_API = "https://api.github.com"


async def _gh(client: httpx.AsyncClient, token: str, path: str):
    """Authenticated GitHub API call. Returns None on error."""
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


def _label_names(labels: list[dict]) -> str:
    return json.dumps([lbl.get("name", "") for lbl in labels if lbl.get("name")])


async def run() -> None:
    """Entry point called by SyncEngine."""
    db = SessionLocal()
    try:
        from api.setup import _get_config  # local import to avoid circular deps

        token = _get_config(db, "github_token")
        if not token:
            print("[pull-requests] No token configured, skipping sync")
            return

        # Fetch repos from DB that have been synced
        repos = db.query(Repository).all()
        if not repos:
            print("[pull-requests] No repos synced yet, skipping")
            return

        print(f"[pull-requests] Syncing PRs and issues for {len(repos)} repos")
        synced_at = datetime.now(timezone.utc)

        async with httpx.AsyncClient(timeout=30) as client:
            for repo in repos:
                full_name = repo.full_name

                # ── Pull Requests ───────────────────────────────────────────────
                prs_data = await _gh(
                    client, token,
                    f"/repos/{full_name}/pulls?state=open&per_page=100&sort=created&direction=asc"
                )
                if isinstance(prs_data, list):
                    # Delete stale open PRs for this repo, then re-insert
                    db.query(PullRequest).filter_by(
                        repo_full_name=full_name, state="open"
                    ).delete()

                    for pr in prs_data:
                        db.add(PullRequest(
                            repo_full_name=full_name,
                            number=pr["number"],
                            title=pr.get("title", ""),
                            state="open",
                            is_draft=pr.get("draft", False),
                            author_login=pr.get("user", {}).get("login"),
                            labels_json=_label_names(pr.get("labels", [])),
                            created_at=_parse_dt(pr.get("created_at")),
                            updated_at=_parse_dt(pr.get("updated_at")),
                            merged_at=_parse_dt(pr.get("merged_at")),
                            closed_at=_parse_dt(pr.get("closed_at")),
                            synced_at=synced_at,
                        ))

                await asyncio.sleep(0.05)

                # ── Issues (excluding PRs) ──────────────────────────────────────
                issues_data = await _gh(
                    client, token,
                    f"/repos/{full_name}/issues?state=open&per_page=100&sort=created&direction=asc"
                )
                if isinstance(issues_data, list):
                    db.query(Issue).filter_by(
                        repo_full_name=full_name, state="open"
                    ).delete()

                    for issue in issues_data:
                        # GitHub returns PRs mixed in with issues – skip them
                        if "pull_request" in issue:
                            continue
                        db.add(Issue(
                            repo_full_name=full_name,
                            number=issue["number"],
                            title=issue.get("title", ""),
                            state="open",
                            author_login=issue.get("user", {}).get("login"),
                            labels_json=_label_names(issue.get("labels", [])),
                            created_at=_parse_dt(issue.get("created_at")),
                            updated_at=_parse_dt(issue.get("updated_at")),
                            closed_at=_parse_dt(issue.get("closed_at")),
                            synced_at=synced_at,
                        ))

                await asyncio.sleep(0.05)

            db.commit()
            pr_count = db.query(PullRequest).filter_by(state="open").count()
            issue_count = db.query(Issue).filter_by(state="open").count()
            print(f"[pull-requests] Sync complete: {pr_count} open PRs, {issue_count} open issues")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
