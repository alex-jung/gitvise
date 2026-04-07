import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

const OctokitWithPlugins = Octokit.plugin(retry, throttling);

export interface GitHubClientOptions {
  token: string;
  /** Max retries on 5xx errors (default: 3) */
  retries?: number;
  /** Log rate limit warnings (default: true) */
  logRateLimit?: boolean;
}

export function createGitHubClient(options: GitHubClientOptions | string) {
  const { token, retries = 3, logRateLimit = true } =
    typeof options === "string" ? { token: options } : options;

  return new OctokitWithPlugins({
    auth: token,
    retry: { doNotRetry: ["429", "404", "422"] },
    throttle: {
      onRateLimit(retryAfter, options_, _octokit, retryCount) {
        if (logRateLimit) {
          console.warn(
            `Rate limit hit for ${options_.method} ${options_.url}. ` +
              `Retry after ${retryAfter}s (attempt ${retryCount + 1}/${retries})`
          );
        }
        return retryCount < retries;
      },
      onSecondaryRateLimit(retryAfter, options_, _octokit, retryCount) {
        if (logRateLimit) {
          console.warn(
            `Secondary rate limit hit for ${options_.method} ${options_.url}. ` +
              `Retry after ${retryAfter}s (attempt ${retryCount + 1}/${retries})`
          );
        }
        return retryCount < 1;
      },
    },
  });
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

export async function getRateLimit(client: GitHubClient) {
  const { data } = await client.rest.rateLimit.get();
  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    resetAt: new Date(data.rate.reset * 1000),
    used: data.rate.used,
  };
}
