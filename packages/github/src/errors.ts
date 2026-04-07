export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class RateLimitError extends GitHubApiError {
  constructor(public readonly resetAt: Date) {
    super(`Rate limit exceeded. Resets at ${resetAt.toISOString()}`, 429);
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends GitHubApiError {
  constructor(url?: string) {
    super("Resource not found", 404, url);
    this.name = "NotFoundError";
  }
}
