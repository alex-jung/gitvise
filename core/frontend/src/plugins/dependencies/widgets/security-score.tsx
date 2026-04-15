"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Gauge } from "@/components/ui";
import type { GaugeZone } from "@/components/ui";

interface Summary { securityScore: number; total: number }

const ZONES: GaugeZone[] = [
  { from: 0,  to: 40,  color: "var(--color-danger)" },
  { from: 40, to: 70,  color: "var(--color-warning)" },
  { from: 70, to: 100, color: "var(--color-success)" },
];

export function SecurityScore({ config: _ }: { config: Record<string, unknown> }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Summary>("/api/core/deps/summary")
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div style={{ height: 140, background: "var(--color-border)", borderRadius: "var(--radius-md)", opacity: 0.4 }} />;
  }

  return (
    <Gauge
      value={data.securityScore}
      min={0}
      max={100}
      zones={ZONES}
      label={data.total === 0 ? "No vulnerabilities" : `${data.total} open alert${data.total !== 1 ? "s" : ""}`}
      formatValue={(v) => String(Math.round(v))}
    />
  );
}
