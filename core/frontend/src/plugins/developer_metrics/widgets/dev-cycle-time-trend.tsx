"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { LineChart } from "@/components/ui";
import type { LineChartSeries } from "@/components/ui";

interface Config { weeks?: number }
interface TrendPoint { week: string; avgHours: number | null }

function fmtHours(h: number): string {
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

export function DevCycleTimeTrend({ config }: { config: Record<string, unknown> }) {
  const weeks = (config as Config).weeks ?? 8;
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<TrendPoint[]>(`/api/core/dev/cycle-time-trend?weeks=${weeks}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [weeks]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
        {[40, 60, 50, 70, 45, 65, 55, 80].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  // Only plot weeks that have data; fill nulls with 0 for the chart
  const hasData = data.some((d) => d.avgHours !== null);
  if (!hasData) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No merged PRs yet.</div>;
  }

  const series: LineChartSeries[] = [{
    label: "Avg cycle time",
    data: data.map((d) => d.avgHours ?? 0),
    color: "var(--color-primary)",
  }];
  const labels = data.map((d) => d.week);

  return (
    <LineChart
      series={series}
      labels={labels}
      height={120}
      showLegend={false}
      filled
      showDots
      formatY={fmtHours}
    />
  );
}
