import type { GitHubClient } from "./client.js";

export async function fetchIssues(
  client: GitHubClient,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
) {
  return client.paginate(client.rest.issues.listForRepo, {
    owner,
    repo,
    state,
    per_page: 100,
  });
}

export async function fetchIssueStats(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const [open, closed] = await Promise.all([
    client.rest.issues.listForRepo({ owner, repo, state: "open", per_page: 1 }),
    client.rest.issues.listForRepo({ owner, repo, state: "closed", per_page: 1 }),
  ]);

  // Extract total counts from Link header
  const openCount = extractTotalCount(open.headers.link) ?? open.data.length;
  const closedCount = extractTotalCount(closed.headers.link) ?? closed.data.length;

  return { open: openCount, closed: closedCount, total: openCount + closedCount };
}

function extractTotalCount(linkHeader?: string): number | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/page=(\d+)>; rel="last"/);
  return match ? parseInt(match[1], 10) : null;
}
