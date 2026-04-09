"""Repository Health sync – fetches repos from GitHub and calculates health scores."""
import asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx

from core.db import SessionLocal
from models.repo import Repository

GITHUB_API = "https://api.github.com"
STALE_DAYS = 30


_SENTINEL = object()  # distinct from None: means "access denied, unknown"


async def _gh(client: httpx.AsyncClient, token: str, path: str):
    """Authenticated GitHub API call.
    Returns None on 404 (not found), _SENTINEL on 403 (no permission), data otherwise."""
    try:
        resp = await client.get(
            f"{GITHUB_API}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if resp.status_code == 404:
            return None
        if resp.status_code == 403:
            return _SENTINEL
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError:
        return None


def _health_score(
    pushed_at: Optional[datetime],
    is_archived: bool,
    has_readme: bool,
    has_license: bool,
    has_branch_protection: bool,
    open_issues_count: int,
) -> int:
    if is_archived:
        return 100  # archived = intentionally closed, not unhealthy

    score = 100
    if not has_readme:
        score -= 30
    if not has_license:
        score -= 20
    if not has_branch_protection:
        score -= 20
    if pushed_at:
        days = (datetime.now(timezone.utc) - pushed_at).days
        if days > STALE_DAYS:
            score -= 20
    if open_issues_count > 20:
        score -= 10
    return max(0, score)


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.rstrip("Z")).replace(tzinfo=timezone.utc)


async def run() -> None:
    """Entry point called by SyncEngine."""
    db = SessionLocal()
    try:
        from api.setup import _get_config  # local import to avoid circular deps

        token = _get_config(db, "github_token")
        org = _get_config(db, "github_org")

        if not token or not org:
            print("[repo-health] Setup not completed, skipping sync")
            return

        print(f"[repo-health] Syncing repos for: {org}")

        async with httpx.AsyncClient(timeout=30) as client:
            # Try org endpoint first (for GitHub organisations)
            repos_data = await _gh(client, token, f"/orgs/{org}/repos?per_page=100&sort=pushed")
            if not isinstance(repos_data, list):
                # Fall back to authenticated-user endpoint – returns private repos too
                repos_data = await _gh(client, token, "/user/repos?per_page=100&sort=pushed&visibility=all&affiliation=owner")

            if not isinstance(repos_data, list):
                print(f"[repo-health] Could not fetch repos for {org}")
                return

            synced_at = datetime.now(timezone.utc)

            for repo_data in repos_data:
                full_name: str = repo_data["full_name"]
                owner, name = full_name.split("/", 1)
                default_branch: str = repo_data.get("default_branch", "main")

                # Check README: None=404=missing, _SENTINEL=403=assume exists, dict=found
                readme = await _gh(client, token, f"/repos/{full_name}/readme")
                has_readme = readme is not None  # covers both dict and _SENTINEL

                # LICENSE comes from repo list (license object)
                has_license = bool(repo_data.get("license"))

                # Branch protection: use the branch endpoint's public `protected` field
                # (the /protection sub-endpoint requires admin access and returns 403)
                branch_info = await _gh(
                    client, token,
                    f"/repos/{full_name}/branches/{default_branch}",
                )
                if branch_info and branch_info is not _SENTINEL:
                    has_branch_protection = bool(branch_info.get("protected", False))
                else:
                    has_branch_protection = False

                pushed_at = _parse_dt(repo_data.get("pushed_at"))
                created_at = _parse_dt(repo_data.get("created_at"))

                score = _health_score(
                    pushed_at=pushed_at,
                    is_archived=repo_data.get("archived", False),
                    has_readme=has_readme,
                    has_license=has_license,
                    has_branch_protection=has_branch_protection,
                    open_issues_count=repo_data.get("open_issues_count", 0),
                )

                existing = db.query(Repository).filter_by(full_name=full_name).first()
                fields = dict(
                    name=name,
                    owner=owner,
                    description=repo_data.get("description"),
                    language=repo_data.get("language"),
                    is_private=repo_data.get("private", False),
                    is_archived=repo_data.get("archived", False),
                    has_readme=has_readme,
                    has_license=has_license,
                    has_branch_protection=has_branch_protection,
                    default_branch=default_branch,
                    open_issues_count=repo_data.get("open_issues_count", 0),
                    forks_count=repo_data.get("forks_count", 0),
                    stargazers_count=repo_data.get("stargazers_count", 0),
                    size_kb=repo_data.get("size", 0),
                    pushed_at=pushed_at,
                    created_at=created_at,
                    health_score=score,
                    synced_at=synced_at,
                )

                if existing:
                    for k, v in fields.items():
                        setattr(existing, k, v)
                else:
                    db.add(Repository(full_name=full_name, **fields))

                await asyncio.sleep(0.05)  # soft rate-limit guard

            db.commit()
            print(f"[repo-health] Synced {len(repos_data)} repos")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
