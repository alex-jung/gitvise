"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config { days?: number; exclude_bots?: boolean }

interface Summary {
  activeContributors: number;
  totalCommits: number;
  newContributors: number;
  avgCommitsPerDay: number;
  lastSyncedAt: string | null;
}

interface Contributor {
  login: string;
  displayName: string;
  commits: number;
  isNew: boolean;
  firstCommitAt: string | null;
}

export function TeamNewContributors({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 30;
  const excludeBots = (config as Config).exclude_bots ?? true;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [newOnes, setNewOnes] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Summary>(`/api/core/team/summary?days=${days}&exclude_bots=${excludeBots}`),
      apiGet<Contributor[]>(`/api/core/team/contributors?days=${days}&exclude_bots=${excludeBots}&limit=100`),
    ])
      .then(([sum, contribs]) => {
        setSummary(sum);
        setNewOnes(contribs.filter((c) => c.isNew));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days, excludeBots]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[50, 70, 40].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!summary) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No data.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: "var(--color-success)" }}>{summary.newContributors}</span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>new contributors</span>
      </div>
      {newOnes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {newOnes.slice(0, 4).map((c) => (
            <div key={c.login} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.displayName}
              </span>
              <span style={{ flexShrink: 0, fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-success)", marginLeft: "var(--space-2)" }}>
                {c.commits}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
