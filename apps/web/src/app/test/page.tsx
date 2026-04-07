"use client";

import { useState } from "react";
import {
  testRateLimit,
  testOrgRepos,
  testUserRepos,
  testPullRequests,
  testDependabotAlerts,
  testWorkflows,
  type TestResult,
} from "./actions";

type Endpoint = {
  label: string;
  params: { name: string; placeholder: string }[];
  run: (token: string, params: string[]) => Promise<TestResult>;
};

const ENDPOINTS: Endpoint[] = [
  {
    label: "Rate Limit",
    params: [],
    run: (token) => testRateLimit(token),
  },
  {
    label: "Org Repos",
    params: [{ name: "org", placeholder: "org name" }],
    run: (token, [org]) => testOrgRepos(token, org),
  },
  {
    label: "User Repos",
    params: [{ name: "username", placeholder: "username" }],
    run: (token, [username]) => testUserRepos(token, username),
  },
  {
    label: "Pull Requests",
    params: [
      { name: "owner", placeholder: "owner" },
      { name: "repo", placeholder: "repo" },
    ],
    run: (token, [owner, repo]) => testPullRequests(token, owner, repo),
  },
  {
    label: "Dependabot Alerts",
    params: [
      { name: "owner", placeholder: "owner" },
      { name: "repo", placeholder: "repo" },
    ],
    run: (token, [owner, repo]) => testDependabotAlerts(token, owner, repo),
  },
  {
    label: "Workflows",
    params: [
      { name: "owner", placeholder: "owner" },
      { name: "repo", placeholder: "repo" },
    ],
    run: (token, [owner, repo]) => testWorkflows(token, owner, repo),
  },
];

export default function TestPage() {
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState(0);
  const [params, setParams] = useState<string[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = ENDPOINTS[selected];

  const handleRun = async () => {
    if (!token) return;
    setLoading(true);
    setResult(null);
    const res = await endpoint.run(token, params);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">GitHub API Tester</h1>
          <p className="text-gray-400 text-sm">Test the GitHub API endpoints</p>
        </div>

        {/* Token */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">
            GitHub Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Endpoint selector */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">Endpoint</label>
          <div className="flex flex-wrap gap-2">
            {ENDPOINTS.map((e, i) => (
              <button
                key={e.label}
                onClick={() => {
                  setSelected(i);
                  setParams([]);
                  setResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selected === i
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Params */}
        {endpoint.params.length > 0 && (
          <div className="mb-6 flex gap-3">
            {endpoint.params.map((p, i) => (
              <input
                key={p.name}
                value={params[i] ?? ""}
                onChange={(e) => {
                  const next = [...params];
                  next[i] = e.target.value;
                  setParams(next);
                }}
                placeholder={p.placeholder}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            ))}
          </div>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={loading || !token}
          className="mb-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Running…" : "Run"}
        </button>

        {/* Result */}
        {result && (
          <div
            className={`rounded-xl border p-4 ${
              result.ok
                ? "border-green-800 bg-green-950/30"
                : "border-red-800 bg-red-950/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  result.ok ? "bg-green-700 text-green-100" : "bg-red-700 text-red-100"
                }`}
              >
                {result.ok ? "OK" : "ERROR"}
              </span>
            </div>
            <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result.ok ? result.data : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
