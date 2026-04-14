"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { BarChart } from "@/components/ui";
import type { BarChartSeries } from "@/components/ui";

interface Config {
  max_labels?: number;
}

interface LabelCount {
  label: string;
  count: number;
}

export function IssuesByLabel({ config }: { config: Record<string, unknown> }) {
  const cfg = config as Config;
  const maxLabels = cfg.max_labels ?? 8;

  const [data, setData] = useState<LabelCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LabelCount[]>(`/api/core/issues/by-label?limit=${maxLabels}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [maxLabels]);

  if (loading) {
    return <div style={{ height: 180, background: "var(--color-border)", borderRadius: "var(--radius-md)", opacity: 0.4 }} />;
  }

  if (data.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        No open issues.
      </div>
    );
  }

  const labels = data.map((d) => d.label);
  const series: BarChartSeries[] = [
    {
      label: "Issues",
      data: data.map((d) => d.count),
      color: "var(--color-info, var(--color-primary))",
    },
  ];

  return (
    <BarChart
      labels={labels}
      series={series}
      formatY={(v) => String(Math.round(v))}
    />
  );
}
