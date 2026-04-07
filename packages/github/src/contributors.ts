import type { GitHubClient } from "./client.js";

export async function fetchContributors(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  return client.paginate(client.rest.repos.listContributors, {
    owner,
    repo,
    per_page: 100,
  });
}

export async function fetchCommitActivity(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const { data } = await client.rest.repos.getCommitActivityStats({
    owner,
    repo,
  });
  // Returns last 52 weeks of commit activity
  return data ?? [];
}

export async function fetchCodeFrequency(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const { data } = await client.rest.repos.getCodeFrequencyStats({
    owner,
    repo,
  });
  // Returns weekly additions/deletions
  return data ?? [];
}

export async function fetchParticipation(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const { data } = await client.rest.repos.getParticipationStats({
    owner,
    repo,
  });
  // Returns last 52 weeks: owner vs all
  return data;
}
