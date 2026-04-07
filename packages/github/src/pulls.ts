import type { GitHubClient } from "./client.js";

export async function fetchPullRequests(
  client: GitHubClient,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all"
) {
  return client.paginate(client.rest.pulls.list, {
    owner,
    repo,
    state,
    per_page: 100,
  });
}

export async function fetchPrCycleTime(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const prs = await fetchPullRequests(client, owner, repo, "closed");
  const merged = prs.filter((pr) => pr.merged_at);

  const cycleTimes = merged.map((pr) => {
    const openedAt = new Date(pr.created_at).getTime();
    const mergedAt = new Date(pr.merged_at!).getTime();
    const hours = (mergedAt - openedAt) / 1000 / 60 / 60;
    return { number: pr.number, title: pr.title, hours };
  });

  const avg =
    cycleTimes.length > 0
      ? cycleTimes.reduce((sum, pr) => sum + pr.hours, 0) / cycleTimes.length
      : 0;

  return { prs: cycleTimes, avgHours: Math.round(avg * 10) / 10 };
}

export async function fetchStalePrs(
  client: GitHubClient,
  owner: string,
  repo: string,
  staleDays = 14
) {
  const prs = await fetchPullRequests(client, owner, repo, "open");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  return prs.filter((pr) => new Date(pr.updated_at) < cutoff);
}
