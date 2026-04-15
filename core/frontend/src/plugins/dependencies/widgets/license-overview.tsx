"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { BarChart } from "@/components/ui";
import type { BarChartSeries } from "@/components/ui";

interface Config { max_licenses?: number }
interface LicenseCount { license: string; count: number }

export function LicenseOverview({ config }: { config: Record<string, unknown> }) {
  const maxLicenses = (config as Config).max_licenses ?? 10;
  const [data, setData] = useState<LicenseCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LicenseCount[]>(`/api/core/deps/licenses?limit=${maxLicenses}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [maxLicenses]);

  if (loading) {
    return <div style={{ height: 180, background: "var(--color-border)", borderRadius: "var(--radius-md)", opacity: 0.4 }} />;
  }

  if (data.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        No repositories synced.
      </div>
    );
  }

  const labels = data.map((d) => d.license);
  const series: BarChartSeries[] = [
    {
      label: "Repositories",
      data: data.map((d) => d.count),
      color: "var(--color-primary)",
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
