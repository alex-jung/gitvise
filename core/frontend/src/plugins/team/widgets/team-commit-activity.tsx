"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { BarChart } from "@/components/ui";
import type { BarChartSeries } from "@/components/ui";

interface Config { days?: number; exclude_bots?: boolean }
interface DayPoint { date: string; commits: number }

export function TeamCommitActivity({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 14;
  const excludeBots = (config as Config).exclude_bots ?? true;
  const [data, setData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DayPoint[]>(`/api/core/team/commit-activity?days=${days}&exclude_bots=${excludeBots}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [days, excludeBots]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
        {[40, 60, 30, 80, 50, 70, 45].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!data.length || data.every((d) => d.commits === 0)) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No commits in last {days} days.</div>;
  }

  const series: BarChartSeries[] = [{
    label: "Commits",
    data: data.map((d) => d.commits),
    color: "var(--color-primary)",
  }];
  const labels = data.map((d) => d.date);

  return (
    <BarChart series={series} labels={labels} height={120} showLegend={false} gridLines={4} />
  );
}
