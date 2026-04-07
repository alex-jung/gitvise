import type { GitHubClient } from "./client.js";

export async function fetchWorkflows(
  client: GitHubClient,
  owner: string,
  repo: string
) {
  const { data } = await client.rest.actions.listRepoWorkflows({
    owner,
    repo,
    per_page: 100,
  });
  return data.workflows;
}

export async function fetchWorkflowRuns(
  client: GitHubClient,
  owner: string,
  repo: string,
  workflowId: number
) {
  const runs = await client.paginate(
    client.rest.actions.listWorkflowRuns,
    {
      owner,
      repo,
      workflow_id: workflowId,
      per_page: 100,
    }
  );
  return runs;
}
