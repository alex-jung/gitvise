"""Repository Health sync – fetches repos from GitHub and calculates health scores."""
import asyncio
import json
import fnmatch
from datetime import datetime, timezone
from typing import Optional

from models.health_snapshot import HealthSnapshot

import httpx

from core.db import SessionLocal
from models.repo import Repository

GITHUB_API = "https://api.github.com"
_DEFAULT_STALE_DAYS = 30
_DEFAULT_REQUIRED_FILES = ["README", "LICENSE"]


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


def _load_plugin_settings(db) -> dict:
    """Load repo-health plugin settings from AppConfig."""
    from api.setup import _get_config  # local import to avoid circular deps
    raw = _get_config(db, "plugin_settings_repo_health")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {}


def _health_score(
    pushed_at: Optional[datetime],
    is_archived: bool,
    has_readme: bool,
    has_license: bool,
    has_branch_protection: bool,
    open_issues_count: int,
    stale_days: int = _DEFAULT_STALE_DAYS,
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
        if days > stale_days:
            score -= 20
    if open_issues_count > 20:
        score -= 10
    return max(0, score)


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.rstrip("Z")).replace(tzinfo=timezone.utc)


def _parse_required_files(value: str) -> list[str]:
    """Parse comma-separated required file names, normalised to uppercase stems."""
    return [f.strip().upper() for f in value.split(",") if f.strip()]


def _is_excluded(full_name: str, patterns: list[str]) -> bool:
    """Return True if the repo matches any exclude glob pattern."""
    for pat in patterns:
        pat = pat.strip()
        if pat and fnmatch.fnmatch(full_name, pat):
            return True
    return False


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

        # Load plugin settings
        plugin_cfg = _load_plugin_settings(db)
        stale_days: int = int(plugin_cfg.get("stale_threshold_days", _DEFAULT_STALE_DAYS))
        required_files_raw: str = plugin_cfg.get("required_files", "README,LICENSE")
        required_stems = _parse_required_files(required_files_raw)
        exclude_repos_raw: str = plugin_cfg.get("exclude_repos", "")
        exclude_patterns = [p.strip() for p in exclude_repos_raw.split(",") if p.strip()]
        exclude_archived: bool = bool(plugin_cfg.get("exclude_archived", False))

        print(f"[repo-health] Syncing repos for: {org} (stale={stale_days}d, required={required_stems})")

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
            skipped = 0

            for repo_data in repos_data:
                full_name: str = repo_data["full_name"]
                is_archived: bool = repo_data.get("archived", False)

                # Apply exclusion rules
                if exclude_archived and is_archived:
                    skipped += 1
                    continue
                if _is_excluded(full_name, exclude_patterns):
                    skipped += 1
                    continue

                owner, name = full_name.split("/", 1)
                default_branch: str = repo_data.get("default_branch", "main")

                # Check README: None=404=missing, _SENTINEL=403=assume exists, dict=found
                readme = await _gh(client, token, f"/repos/{full_name}/readme")
                has_readme = readme is not None  # covers both dict and _SENTINEL

                # LICENSE comes from repo list (license object)
                has_license = bool(repo_data.get("license"))

                # Check additional required files (beyond README/LICENSE)
                extra_stems = [s for s in required_stems if s not in ("README", "LICENSE")]
                for stem in extra_stems:
                    # Try common extensions: no extension, .md, .txt
                    found = False
                    for candidate in [stem, f"{stem}.md", f"{stem}.txt"]:
                        contents = await _gh(client, token, f"/repos/{full_name}/contents/{candidate}")
                        if contents is not None:
                            found = True
                            break
                    if not found:
                        # Penalise missing required file by treating it like missing readme
                        has_readme = False
                        break

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
                    is_archived=is_archived,
                    has_readme=has_readme,
                    has_license=has_license,
                    has_branch_protection=has_branch_protection,
                    open_issues_count=repo_data.get("open_issues_count", 0),
                    stale_days=stale_days,
                )

                existing = db.query(Repository).filter_by(full_name=full_name).first()
                fields = dict(
                    name=name,
                    owner=owner,
                    description=repo_data.get("description"),
                    language=repo_data.get("language"),
                    is_private=repo_data.get("private", False),
                    is_archived=is_archived,
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
            synced_count = len(repos_data) - skipped
            print(f"[repo-health] Synced {synced_count} repos (skipped {skipped})")

            # Record a health snapshot for historical trend tracking
            rows = db.query(Repository).all()
            if rows:
                now_utc = datetime.now(timezone.utc)
                avg = round(sum(r.health_score for r in rows) / len(rows))
                crit = sum(1 for r in rows if r.health_score < 40)
                stale_count = sum(
                    1 for r in rows
                    if r.pushed_at and (now_utc - r.pushed_at.replace(tzinfo=timezone.utc) if r.pushed_at.tzinfo is None else now_utc - r.pushed_at).days > 30
                    and not r.is_archived
                )
                unprot = sum(1 for r in rows if not r.has_branch_protection and not r.is_archived)
                db.add(HealthSnapshot(
                    recorded_at=now_utc,
                    avg_score=avg,
                    critical=crit,
                    stale=stale_count,
                    unprotected=unprot,
                    total=len(rows),
                ))
                db.commit()

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
