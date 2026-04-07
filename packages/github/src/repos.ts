import type { GitHubClient } from "./client.js";

export async function fetchOrgRepos(client: GitHubClient, org: string) {
  const repos = await client.paginate(client.rest.repos.listForOrg, {
    org,
    type: "all",
    per_page: 100,
  });
  return repos;
}

export async function fetchUserRepos(client: GitHubClient, username: string) {
  const repos = await client.paginate(client.rest.repos.listForUser, {
    username,
    type: "all",
    per_page: 100,
  });
  return repos;
}

export async function fetchRepoDetails(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const { data } = await client.rest.repos.get({ owner, repo });
  return data;
}
