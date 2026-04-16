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

export function TeamContributors({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 30;
  const excludeBots = (config as Config).exclude_bots ?? true;
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>(`/api/core/team/summary?days=${days}&exclude_bots=${excludeBots}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
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

  if (!data) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No data.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: "var(--color-primary)" }}>{data.activeContributors}</span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>active contributors</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <Stat label="Commits" value={data.totalCommits} />
        <Stat label="Avg/day" value={data.avgCommitsPerDay} />
        <Stat label="Window" value={`${days}d`} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, color: color ?? "var(--color-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}
