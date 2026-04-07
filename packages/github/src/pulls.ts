import type { GitHubClient } from "./client.js";

export async function fetchPullRequests(
  client: GitHubClient,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all"
) {
  const pulls = await client.paginate(client.rest.pulls.list, {
    owner,
    repo,
    state,
    per_page: 100,
  });
  return pulls;
}
