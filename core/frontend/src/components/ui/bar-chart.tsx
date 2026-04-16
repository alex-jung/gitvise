"use client";

import React, { useState } from "react";

export interface BarChartSeries {
  label: string;
  data: number[];
  color?: string;
}

interface BarChartProps {
  series: BarChartSeries[];
  labels?: string[];
  height?: number;
  gridLines?: number;
  showLegend?: boolean;
  /** Stack bars instead of grouping side-by-side */
  stacked?: boolean;
  formatY?: (value: number) => string;
}

const COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-info)",
];

function niceMax(rawMax: number, ticks: number): number {
  if (rawMax === 0) return ticks;
  const rough = rawMax / ticks;
  const exp = Math.floor(Math.log10(rough));
  const f = rough / Math.pow(10, exp);
  let nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const step = nf * Math.pow(10, exp);
  return Math.ceil(rawMax / step) * step;
}

export function BarChart({
  series,
  labels,
  height = 200,
  gridLines = 5,
  showLegend = true,
  stacked = false,
  formatY = (v) => String(Math.round(v)),
}: BarChartProps) {
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(null);

  if (!series.length) return null;
  const numGroups = Math.max(...series.map((s) => s.data.length));
  if (numGroups === 0) return null;

  // Y-axis range
  let yMax: number;
  if (stacked) {
    const totals = Array.from({ length: numGroups }, (_, i) =>
      series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0)
    );
    yMax = niceMax(Math.max(...totals, 0.001), gridLines);
  } else {
    yMax = niceMax(
      Math.max(...series.flatMap((s) => s.data), 0.001),
      gridLines
    );
  }

  // Layout
  const padL = 44;
  const padR = 12;
  const padT = 8;
  const padB = labels ? 28 : 8;
  const svgW = 600;
  const svgH = height;
  const cW = svgW - padL - padR;
  const cH = svgH - padT - padB;

  const groupW = cW / numGroups;
  const numSeries = series.length;
  const groupPad = groupW * 0.15;
  const barAreaW = groupW - groupPad * 2;
  const barW = stacked ? barAreaW : barAreaW / numSeries;

  // Y ticks
  const yTicks = Array.from({ length: gridLines }, (_, i) =>
    (yMax / (gridLines - 1)) * i
  );

  function toY(v: number) {
    return padT + cH - (v / yMax) * cH;
  }

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", height, display: "block" }}
        aria-label="Bar chart"
      >
        {/* Grid lines + Y labels */}
        {yTicks.map((tick, i) => {
          const y = toY(tick);
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={padL + cW}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : "3 3"}
              />
              <text
                x={padL - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="var(--color-text-muted)"
              >
                {formatY(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {Array.from({ length: numGroups }, (_, gi) => {
          const gx = padL + gi * groupW + groupPad;
          if (stacked) {
            let baseline = padT + cH;
            return (
              <g key={gi}>
                {series.map((s, si) => {
                  const v = s.data[gi] ?? 0;
                  const barH = (v / yMax) * cH;
                  const color = s.color ?? COLORS[si % COLORS.length];
                  const opacity =
                    hoveredSeries === null || hoveredSeries === si ? 1 : 0.3;
                  const rect = (
                    <rect
                      key={si}
                      x={gx}
                      y={baseline - barH}
                      width={barAreaW}
                      height={Math.max(barH, 0)}
                      fill={color}
                      style={{ opacity, transition: "opacity 150ms" }}
                      rx={si === numSeries - 1 ? 2 : 0}
                    />
                  );
                  baseline -= barH;
                  return rect;
                })}
              </g>
            );
          }
          return (
            <g key={gi}>
              {series.map((s, si) => {
                const v = s.data[gi] ?? 0;
                const barH = (v / yMax) * cH;
                const color = s.color ?? COLORS[si % COLORS.length];
                const opacity =
                  hoveredSeries === null || hoveredSeries === si ? 1 : 0.3;
                return (
                  <rect
                    key={si}
                    x={gx + si * barW}
                    y={toY(v)}
                    width={Math.max(barW - 2, 1)}
                    height={Math.max(barH, 0)}
                    fill={color}
                    rx={2}
                    style={{ opacity, transition: "opacity 150ms" }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* X labels */}
        {labels &&
          labels.slice(0, numGroups).map((label, gi) => {
            const x = padL + gi * groupW + groupW / 2;
            const step = Math.ceil(numGroups / 10);
            if (gi % step !== 0 && gi !== numGroups - 1) return null;
            return (
              <text
                key={gi}
                x={x}
                y={svgH - padB + 14}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-text-muted)"
              >
                {label}
              </text>
            );
          })}
      </svg>

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            marginTop: "var(--space-2)",
            justifyContent: "center",
          }}
        >
          {series.map((s, si) => {
            const color = s.color ?? COLORS[si % COLORS.length];
            return (
              <button
                key={si}
                onMouseEnter={() => setHoveredSeries(si)}
                onMouseLeave={() => setHoveredSeries(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  opacity:
                    hoveredSeries !== null && hoveredSeries !== si ? 0.4 : 1,
                  transition: "opacity 150ms",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: color,
                    borderRadius: 2,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
