export { createGitHubClient } from "./client.js";
export type { GitHubClient } from "./client.js";

export { fetchOrgRepos, fetchUserRepos, fetchRepoDetails } from "./repos.js";
export { fetchPullRequests } from "./pulls.js";
export { fetchWorkflows, fetchWorkflowRuns } from "./workflows.js";
export { fetchDependabotAlerts } from "./dependabot.js";
