"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { BarChart } from "@/components/ui";
import type { BarChartSeries } from "@/components/ui";

interface Bucket {
  label: string;
  count: number;
}

const BUCKET_COLORS = [
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "color-mix(in srgb, var(--color-danger) 70%, black)",
];

export function PrsAgeDistribution({ config: _ }: { config: Record<string, unknown> }) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Bucket[]>("/api/core/prs/age-distribution")
      .then(setBuckets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ height: 180, background: "var(--color-border)", borderRadius: "var(--radius-md)", opacity: 0.4 }} />;
  }

  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        No open pull requests.
      </div>
    );
  }

  const labels = buckets.map((b) => b.label);
  const series: BarChartSeries[] = buckets.map((b, i) => ({
    label: b.label,
    data: buckets.map((_, j) => (j === i ? b.count : 0)),
    color: BUCKET_COLORS[i % BUCKET_COLORS.length],
  }));

  // Simpler: single series with per-bar colors via stacked=false
  const singleSeries: BarChartSeries[] = [
    {
      label: "PRs",
      data: buckets.map((b) => b.count),
      color: "var(--color-primary)",
    },
  ];

  return (
    <BarChart
      labels={labels}
      series={singleSeries}
      formatY={(v) => String(Math.round(v))}
    />
  );
}
