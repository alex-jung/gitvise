"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { DonutChart } from "@/components/ui";
import type { PieSlice } from "@/components/ui";

interface Summary {
  open: number;
  drafts: number;
  ready: number;
}

export function PrsDraftRatio({ config: _ }: { config: Record<string, unknown> }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>("/api/core/prs/summary")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.open === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        {loading ? "Loading…" : "No open PRs."}
      </div>
    );
  }

  const slices: PieSlice[] = [
    { label: "Ready", value: data.ready, color: "var(--color-success)" },
    { label: "Draft", value: data.drafts, color: "var(--color-text-muted)" },
  ].filter((s) => s.value > 0);

  return (
    <DonutChart
      slices={slices}
      centerLabel={String(data.open)}
      centerSublabel="total"
    />
  );
}
