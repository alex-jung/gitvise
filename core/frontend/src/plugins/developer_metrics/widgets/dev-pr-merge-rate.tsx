"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config { days?: number }

interface Summary {
  avgCycleTimeHours: number | null;
  totalMerged: number;
  totalClosed: number;
  mergeRate: number | null;
  topCommitter: string | null;
}

export function DevPrMergeRate({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 30;
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>(`/api/core/dev/summary?days=${days}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[50, 70, 40].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!data || data.mergeRate === null) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No closed PRs in last {days} days.</div>;
  }

  const color = data.mergeRate >= 80 ? "var(--color-success)" : data.mergeRate >= 60 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color }}>{data.mergeRate}%</span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>merge rate</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Stat label="Merged" value={data.totalMerged} color="var(--color-success)" />
        <Stat label="Closed w/o merge" value={data.totalClosed - data.totalMerged} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, color: color ?? "var(--color-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}
