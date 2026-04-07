import type { GitHubClient } from "./client.js";

export async function fetchDependabotAlerts(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const alerts = await client.paginate(
    client.rest.dependabot.listAlertsForRepo,
    {
      owner,
      repo,
      per_page: 100,
    }
  );
  return alerts;
}
