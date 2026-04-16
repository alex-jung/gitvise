"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { LineChart } from "@/components/ui";
import type { LineChartSeries } from "@/components/ui";

interface Config { days?: number }
interface Point { date: string; avgSeconds: number }

export function CiDurationTrend({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 14;
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Point[]>(`/api/core/ci/duration-trend?days=${days}`)
      .then(setPoints).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return <div style={{ height: 180, background: "var(--color-border)", borderRadius: "var(--radius-md)", opacity: 0.4 }} />;
  }

  const hasData = points.some((p) => p.avgSeconds > 0);
  if (!hasData) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        No completed runs in the last {days} days.
      </div>
    );
  }

  const labels = points.map((p) => p.date);
  const series: LineChartSeries[] = [
    {
      label: "Avg duration",
      data: points.map((p) => Math.round(p.avgSeconds / 60)),
      color: "var(--color-primary)",
    },
  ];

  return (
    <LineChart
      labels={labels}
      series={series}
      filled
      formatY={(v) => `${v}m`}
      showLegend={false}
    />
  );
}
