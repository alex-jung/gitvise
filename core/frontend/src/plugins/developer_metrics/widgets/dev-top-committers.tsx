"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { BarChart } from "@/components/ui";
import type { BarChartSeries } from "@/components/ui";

interface Config { days?: number; limit?: number }

interface LeaderboardRow {
  login: string;
  displayName: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  avgCycleTimeHours: number | null;
}

export function DevTopCommitters({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 30;
  const limit = (config as Config).limit ?? 8;
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LeaderboardRow[]>(`/api/core/dev/leaderboard?days=${days}&limit=${limit}`)
      .then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [days, limit]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
        {[60, 80, 50, 70, 40, 55, 35, 45].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  const top = rows.filter((r) => r.commits > 0).slice(0, limit);
  if (top.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No commits in last {days} days.</div>;
  }

  const series: BarChartSeries[] = [{
    label: "Commits",
    data: top.map((r) => r.commits),
    color: "var(--color-primary)",
  }];
  const labels = top.map((r) => r.displayName.split(" ")[0] ?? r.login);

  return (
    <BarChart series={series} labels={labels} height={120} showLegend={false} gridLines={4} />
  );
}
