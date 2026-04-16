"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config {
  threshold_warn?: number;
  threshold_critical?: number;
}

interface Summary {
  total: number;
  avgHealthScore: number;
  critical: number;
  stale: number;
  unprotected: number;
}

interface Props {
  config: Config;
}

function scoreColor(score: number, warnThreshold: number, critThreshold: number): string {
  if (score < critThreshold) return "var(--color-danger)";
  if (score < warnThreshold) return "var(--color-warning)";
  return "var(--color-success)";
}

export function HealthScoreCard({ config }: Props) {
  const warnThreshold = config.threshold_warn ?? 60;
  const critThreshold = config.threshold_critical ?? 40;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>("/api/core/repos/summary")
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[60, 40].map((w, i) => (
          <div
            key={i}
            style={{ height: 12, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }}
          />
        ))}
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        No repositories synced yet.
      </div>
    );
  }

  const color = scoreColor(summary.avgHealthScore, warnThreshold, critThreshold);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Big score */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color }}>{summary.avgHealthScore}</span>
        <span style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)" }}>/100</span>
      </div>

      {/* Sub-stats */}
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Stat label="Repos" value={summary.total} />
        <Stat label="Critical" value={summary.critical} danger={summary.critical > 0} />
        <Stat label="Stale" value={summary.stale} danger={summary.stale > 0} />
        <Stat label="Unprotected" value={summary.unprotected} danger={summary.unprotected > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, color: danger && value > 0 ? "var(--color-danger)" : "var(--color-text-primary)" }}>
        {value}
      </span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}
