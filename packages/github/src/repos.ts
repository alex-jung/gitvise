import type { GitHubClient } from "./client.js";
import { NotFoundError } from "./errors.js";

export async function fetchOrgRepos(client: GitHubClient, org: string) {
  return client.paginate(client.rest.repos.listForOrg, {
    org,
    type: "all",
    per_page: 100,
  });
}

export async function fetchUserRepos(client: GitHubClient, username: string) {
  return client.paginate(client.rest.repos.listForUser, {
    username,
    type: "all",
    per_page: 100,
  });
}

export async function fetchRepoDetails(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const { data } = await client.rest.repos.get({ owner, repo });
  return data;
}

export async function fetchBranchProtection(
  client: GitHubClient,
  owner: string,
  repo: string,
  branch: string
) {
  try {
    const { data } = await client.rest.repos.getBranchProtection({
      owner,
      repo,
      branch,
    });
    return { protected: true, rules: data };
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) return { protected: false, rules: null };
    throw err;
  }
}

export async function checkFileExists(
  client: GitHubClient,
  owner: string,
  repo: string,
  path: string
): Promise<boolean> {
  try {
    await client.rest.repos.getContent({ owner, repo, path });
    return true;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) return false;
    throw err;
  }
}

export async function fetchRepoHealthFiles(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const [hasReadme, hasLicense, hasCodeowners, hasContributing] =
    await Promise.all([
      checkFileExists(client, owner, repo, "README.md"),
      checkFileExists(client, owner, repo, "LICENSE"),
      checkFileExists(client, owner, repo, ".github/CODEOWNERS"),
      checkFileExists(client, owner, repo, "CONTRIBUTING.md"),
    ]);

  return { hasReadme, hasLicense, hasCodeowners, hasContributing };
}

export async function fetchStaleRepos(
  client: GitHubClient,
  owner: string,
  staleDays = 90
) {
  const repos = await fetchOrgRepos(client, owner);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  return repos.filter((repo) => {
    const lastPush = repo.pushed_at ? new Date(repo.pushed_at) : null;
    return lastPush && lastPush < cutoff && !repo.archived;
  });
}

export async function fetchStaleBranches(
  client: GitHubClient,
  owner: string,
  repo: string,
  staleDays = 30
) {
  const branches = await client.paginate(client.rest.repos.listBranches, {
    owner,
    repo,
    per_page: 100,
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  const results = await Promise.all(
    branches.map(async (branch) => {
      const { data: commit } = await client.rest.repos.getCommit({
        owner,
        repo,
        ref: branch.commit.sha,
      });
      const lastCommit = commit.commit.committer?.date
        ? new Date(commit.commit.committer.date)
        : null;
      return { branch: branch.name, lastCommit, stale: lastCommit ? lastCommit < cutoff : false };
    })
  );

  return results.filter((b) => b.stale);
}
