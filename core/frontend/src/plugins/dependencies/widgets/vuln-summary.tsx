"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Summary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  affectedRepos: number;
  securityScore: number;
}

const SEV_COLOR: Record<string, string> = {
  critical: "var(--color-danger)",
  high: "color-mix(in srgb, var(--color-danger) 60%, var(--color-warning))",
  medium: "var(--color-warning)",
  low: "var(--color-text-muted)",
};

export function VulnSummary({ config: _ }: { config: Record<string, unknown> }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>("/api/core/deps/summary")
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
    return (
      <div style={{ color: "var(--color-success)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        ✓ No open vulnerabilities.
      </div>
    );
  }

  const mainColor = data.critical > 0 ? SEV_COLOR.critical : data.high > 0 ? SEV_COLOR.high : data.medium > 0 ? SEV_COLOR.medium : SEV_COLOR.low;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: mainColor }}>{data.total}</span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>open alerts</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        {(["critical", "high", "medium", "low"] as const).map((sev) => (
          <div key={sev} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, color: (data[sev] ?? 0) > 0 ? SEV_COLOR[sev] : "var(--color-text-muted)" }}>
              {data[sev] ?? 0}
            </span>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "capitalize" }}>{sev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
