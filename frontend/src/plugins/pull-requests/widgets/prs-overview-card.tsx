"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config {
  stale_days?: number;
}

interface Summary {
  open: number;
  drafts: number;
  ready: number;
  avgAgeDays: number;
  staleCount: number;
  lastSyncedAt: string | null;
}

export function PrsOverviewCard({ config }: { config: Record<string, unknown> }) {
  const cfg = config as Config;
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>("/api/core/prs/summary")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[60, 40, 50].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!data || data.open === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        No open pull requests.
      </div>
    );
  }

  const staleThreshold = cfg.stale_days ?? 7;
  const staleColor = data.staleCount > 0 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: "var(--color-primary)" }}>
          {data.open}
        </span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>open PRs</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <Stat label="Ready" value={data.ready} />
        <Stat label="Draft" value={data.drafts} muted />
        <Stat label="Avg age" value={`${data.avgAgeDays}d`} />
        <Stat label={`Stale >${staleThreshold}d`} value={data.staleCount} color={staleColor} />
      </div>
    </div>
  );
}

function Stat({ label, value, muted, color, danger }: { label: string; value: number | string; muted?: boolean; color?: string; danger?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{
        fontSize: "var(--font-size-lg)",
        fontWeight: 600,
        color: color ?? (muted ? "var(--color-text-muted)" : (danger ? "var(--color-danger)" : "var(--color-text-primary)")),
      }}>
        {value}
      </span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}
