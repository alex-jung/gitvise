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

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export function DevPrCycleTime({ config }: { config: Record<string, unknown> }) {
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

  if (!data || data.avgCycleTimeHours === null) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No merged PRs in last {days} days.</div>;
  }

  const color = data.avgCycleTimeHours <= 24 ? "var(--color-success)" : data.avgCycleTimeHours <= 72 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color }}>{fmtHours(data.avgCycleTimeHours)}</span>
      </div>
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>avg open → merge · {data.totalMerged} PRs</span>
    </div>
  );
}
