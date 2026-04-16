"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config { weeks?: number; exclude_bots?: boolean }

interface HeatmapData {
  data: number[][];     // 7 rows (Mon–Sun) × weeks cols
  colLabels: string[];  // week start dates MM-DD
  rowLabels: string[];  // Mon … Sun
}

function cellColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "var(--color-border)";
  const intensity = Math.min(value / max, 1);
  // 4 steps
  if (intensity > 0.75) return "var(--color-primary)";
  if (intensity > 0.5)  return "color-mix(in srgb, var(--color-primary) 75%, transparent)";
  if (intensity > 0.25) return "color-mix(in srgb, var(--color-primary) 45%, transparent)";
  return "color-mix(in srgb, var(--color-primary) 20%, transparent)";
}

export function TeamActivityHeatmap({ config }: { config: Record<string, unknown> }) {
  const weeks = (config as Config).weeks ?? 12;
  const excludeBots = (config as Config).exclude_bots ?? true;
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<HeatmapData>(`/api/core/team/heatmap?weeks=${weeks}&exclude_bots=${excludeBots}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [weeks, excludeBots]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: 12 }, (_, j) => (
              <div key={j} style={{ width: 12, height: 12, background: "var(--color-border)", borderRadius: 2 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No data.</div>;
  }

  const max = Math.max(...data.data.flatMap((row) => row));

  // Show every Nth column label to avoid crowding
  const labelStep = Math.max(1, Math.floor(data.colLabels.length / 6));

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 2, minWidth: "max-content" }}>
        {/* Column labels */}
        <div style={{ display: "flex", marginLeft: 32, gap: 3 }}>
          {data.colLabels.map((lbl, ci) => (
            <div key={ci} style={{ width: 12, fontSize: 9, color: "var(--color-text-muted)", textAlign: "center", overflow: "hidden" }}>
              {ci % labelStep === 0 ? lbl : ""}
            </div>
          ))}
        </div>

        {/* Rows */}
        {data.rowLabels.map((rowLbl, ri) => (
          <div key={ri} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {/* Row label */}
            <div style={{ width: 28, textAlign: "right", fontSize: 9, color: "var(--color-text-muted)", flexShrink: 0 }}>
              {rowLbl}
            </div>
            {/* Cells */}
            {data.data[ri].map((val, ci) => (
              <div
                key={ci}
                title={`${rowLbl} ${data.colLabels[ci]}: ${val} commit${val !== 1 ? "s" : ""}`}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: cellColor(val, max),
                  flexShrink: 0,
                  cursor: val > 0 ? "default" : undefined,
                }}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "var(--space-2)", marginLeft: 32 }}>
          <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(t * max, max) }} />
          ))}
          <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>More</span>
        </div>
      </div>
    </div>
  );
}
