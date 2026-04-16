"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config { days?: number }

interface Summary {
  total: number;
  success: number;
  failure: number;
  cancelled: number;
  inProgress: number;
  successRate: number;
  avgDurationSeconds: number;
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export function CiStatusSummary({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 7;
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>(`/api/core/ci/summary?days=${days}`)
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

  if (!data || data.total === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No runs in last {days} days.</div>;
  }

  const rateColor = data.successRate >= 90 ? "var(--color-success)" : data.successRate >= 70 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: rateColor }}>{data.successRate}%</span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>success rate</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <Stat label="Total" value={data.total} />
        <Stat label="Success" value={data.success} color="var(--color-success)" />
        <Stat label="Failed" value={data.failure} color={data.failure > 0 ? "var(--color-danger)" : undefined} />
        <Stat label="Running" value={data.inProgress} />
        <Stat label="Avg time" value={fmtDuration(data.avgDurationSeconds)} />
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
