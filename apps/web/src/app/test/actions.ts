"use server";

import { createClient } from "@/lib/github";

export type TestResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export async function testRateLimit(token: string): Promise<TestResult> {
  try {
    const client = createClient(token);
    const { data } = await client.rest.rateLimit.get();
    return { ok: true, data: data.rate };
  } catch (e: unknown) {
    return { ok: false, error: String(e) };
  }
}

export async function testOrgRepos(
  token: string,
  org: string
): Promise<TestResult> {
  try {
    const client = createClient(token);
    const { data } = await client.rest.repos.listForOrg({
      org,
      per_page: 10,
    });
    return {
      ok: true,
      data: data.map((r) => ({
        name: r.name,
        private: r.private,
        language: r.language,
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
      })),
    };
  } catch (e: unknown) {
    return { ok: false, error: String(e) };
  }
}

export async function testUserRepos(
  token: string,
  username: string
): Promise<TestResult> {
  try {
    const client = createClient(token);
    const { data } = await client.rest.repos.listForUser({
      username,
      per_page: 10,
    });
    return {
      ok: true,
      data: data.map((r) => ({
        name: r.name,
        private: r.private,
        language: r.language,
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
      })),
    };
  } catch (e: unknown) {
    return { ok: false, error: String(e) };
  }
}

export async function testPullRequests(
  token: string,
  owner: string,
  repo: string
): Promise<TestResult> {
  try {
    const client = createClient(token);
    const { data } = await client.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 10,
    });
    return {
      ok: true,
      data: data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login,
        createdAt: pr.created_at,
        draft: pr.draft,
      })),
    };
  } catch (e: unknown) {
    return { ok: false, error: String(e) };
  }
}

export async function testDependabotAlerts(
  token: string,
  owner: string,
  repo: string
): Promise<TestResult> {
  try {
    const client = createClient(token);
    const { data } = await client.rest.dependabot.listAlertsForRepo({
      owner,
      repo,
      per_page: 10,
    });
    return {
      ok: true,
      data: data.map((a) => ({
        number: a.number,
        severity: a.security_advisory.severity,
        package: a.security_vulnerability.package.name,
        state: a.state,
      })),
    };
  } catch (e: unknown) {
    return { ok: false, error: String(e) };
  }
}

export async function testWorkflows(
  token: string,
  owner: string,
  repo: string
): Promise<TestResult> {
  try {
    const client = createClient(token);
    const { data } = await client.rest.actions.listRepoWorkflows({
      owner,
      repo,
    });
    return {
      ok: true,
      data: data.workflows.map((w) => ({
        name: w.name,
        state: w.state,
        path: w.path,
      })),
    };
  } catch (e: unknown) {
    return { ok: false, error: String(e) };
  }
}
