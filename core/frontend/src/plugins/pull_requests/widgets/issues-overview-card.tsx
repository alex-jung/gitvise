"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Summary {
  open: number;
  avgAgeDays: number;
  lastSyncedAt: string | null;
}

export function IssuesOverviewCard({ config: _ }: { config: Record<string, unknown> }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>("/api/core/issues/summary")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[55, 40].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!data || data.open === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        No open issues.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: "var(--color-info, var(--color-primary))" }}>
          {data.open}
        </span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>open issues</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {data.avgAgeDays}d
          </span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Avg age</span>
        </div>
      </div>
    </div>
  );
}
