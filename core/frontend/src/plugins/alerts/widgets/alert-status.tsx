"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface AlertSummary {
  total: number;
  level: "ok" | "warning" | "critical";
  criticalVulns: number;
  staleRepos: number;
  failingWorkflows: number;
  stalePrs: number;
}

interface Props {
  config: Record<string, unknown>;
}

export function AlertStatus({ config }: Props) {
  const showDetails = config.show_details !== false;
  const [data, setData] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/core/alerts/summary`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        Loading…
      </div>
    );
  }

  if (!data) return null;

  const levelColor =
    data.level === "ok"
      ? "var(--color-success)"
      : data.level === "warning"
      ? "var(--color-warning)"
      : "var(--color-danger)";

  const levelLabel =
    data.level === "ok" ? "All clear" : data.level === "warning" ? "Attention needed" : "Action required";

  const rows: { label: string; value: number; color?: string }[] = [
    { label: "Critical / High vulns", value: data.criticalVulns, color: data.criticalVulns > 0 ? "var(--color-danger)" : undefined },
    { label: "Failing workflows", value: data.failingWorkflows, color: data.failingWorkflows > 0 ? "var(--color-danger)" : undefined },
    { label: "Stale repos", value: data.staleRepos, color: data.staleRepos > 0 ? "var(--color-warning)" : undefined },
    { label: "Stale PRs", value: data.stalePrs, color: data.stalePrs > 0 ? "var(--color-warning)" : undefined },
  ];

  return (
    <div style={{ padding: "var(--space-4)" }}>
      {/* Main value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        <span style={{ fontSize: "var(--font-size-3xl)", fontWeight: 700, color: levelColor, lineHeight: 1 }}>
          {data.total}
        </span>
        <span style={{ fontSize: "var(--font-size-sm)", color: levelColor, fontWeight: 500 }}>
          {levelLabel}
        </span>
      </div>

      {/* Breakdown */}
      {showDetails && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--font-size-sm)",
                color: row.value > 0 ? (row.color ?? "var(--color-text-primary)") : "var(--color-text-muted)",
              }}
            >
              <span>{row.label}</span>
              <span style={{ fontWeight: row.value > 0 ? 600 : 400 }}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
