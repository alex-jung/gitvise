import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

const OctokitWithPlugins = Octokit.plugin(retry, throttling);

export function createClient(token: string) {
  return new OctokitWithPlugins({
    auth: token,
    throttle: {
      onRateLimit: () => true,
      onSecondaryRateLimit: () => false,
    },
  });
}
