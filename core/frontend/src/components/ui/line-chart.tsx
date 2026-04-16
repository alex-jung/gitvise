"use client";

import React, { useId, useState } from "react";

export interface LineChartSeries {
  label: string;
  data: number[];
  color?: string;
}

interface LineChartProps {
  series: LineChartSeries[];
  labels?: string[];
  height?: number;
  /** Number of horizontal grid lines */
  gridLines?: number;
  showLegend?: boolean;
  showDots?: boolean;
  filled?: boolean;
  /** Format a Y-axis tick value */
  formatY?: (value: number) => string;
}

const DEFAULT_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-info)",
];

function nice(value: number, round: boolean): number {
  const exp = Math.floor(Math.log10(Math.abs(value) || 1));
  const f = value / Math.pow(10, exp);
  let nf: number;
  if (round) {
    if (f < 1.5) nf = 1;
    else if (f < 3) nf = 2;
    else if (f < 7) nf = 5;
    else nf = 10;
  } else {
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 5) nf = 5;
    else nf = 10;
  }
  return nf * Math.pow(10, exp);
}

function niceRange(min: number, max: number, ticks: number): { min: number; max: number; step: number } {
  const range = nice(max - min || 1, false);
  const step = nice(range / (ticks - 1), true);
  const nMin = Math.floor(min / step) * step;
  const nMax = Math.ceil(max / step) * step;
  return { min: nMin, max: nMax, step };
}

export function LineChart({
  series,
  labels,
  height = 200,
  gridLines = 5,
  showLegend = true,
  showDots = false,
  filled = false,
  formatY = (v) => String(Math.round(v)),
}: LineChartProps) {
  const id = useId();
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(null);

  if (!series.length) return null;

  const allValues = series.flatMap((s) => s.data);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const { min: yMin, max: yMax } = niceRange(dataMin, dataMax, gridLines);
  const yRange = yMax - yMin || 1;

  const maxPoints = Math.max(...series.map((s) => s.data.length));
  if (maxPoints < 2) return null;

  // Layout constants
  const paddingLeft = 44;
  const paddingRight = 12;
  const paddingTop = 8;
  const paddingBottom = labels ? 28 : 8;
  const svgWidth = 600; // viewBox width; scales with container
  const svgHeight = height;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  function toX(i: number, total: number) {
    return paddingLeft + (i / (total - 1)) * chartW;
  }

  function toY(value: number) {
    return paddingTop + chartH - ((value - yMin) / yRange) * chartH;
  }

  // Y-axis tick values
  const yTicks: number[] = [];
  for (let i = 0; i < gridLines; i++) {
    yTicks.push(yMin + (i / (gridLines - 1)) * yRange);
  }

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: "100%", height, display: "block", overflow: "visible" }}
        aria-label="Line chart"
      >
        <defs>
          {series.map((s, si) => {
            const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
            return (
              <linearGradient key={si} id={`${id}-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid lines + Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = toY(tick);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartW}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : "3 3"}
              />
              <text
                x={paddingLeft - 6}
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

        {/* X-axis labels */}
        {labels && labels.map((label, i) => {
          const x = toX(i, labels.length);
          // Only render every Nth label to avoid crowding
          const step = Math.ceil(labels.length / 8);
          if (i % step !== 0 && i !== labels.length - 1) return null;
          return (
            <text
              key={i}
              x={x}
              y={svgHeight - paddingBottom + 14}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-text-muted)"
            >
              {label}
            </text>
          );
        })}

        {/* Series: fill areas first, then lines on top */}
        {filled && series.map((s, si) => {
          const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
          const n = s.data.length;
          const pts = s.data.map((v, i) => [toX(i, n), toY(v)] as [number, number]);
          const areaPath =
            `M${pts[0][0]},${pts[0][1]} ` +
            pts.slice(1).map(([x, y]) => `L${x},${y}`).join(" ") +
            ` L${pts[n - 1][0]},${toY(yMin)} L${pts[0][0]},${toY(yMin)} Z`;
          const opacity = hoveredSeries === null || hoveredSeries === si ? 1 : 0.2;
          return (
            <path
              key={si}
              d={areaPath}
              fill={`url(#${id}-fill-${si})`}
              style={{ opacity, transition: "opacity 150ms" }}
            />
          );
        })}

        {series.map((s, si) => {
          const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
          const n = s.data.length;
          const pts = s.data.map((v, i) => [toX(i, n), toY(v)] as [number, number]);
          const linePath =
            `M${pts[0][0]},${pts[0][1]} ` +
            pts.slice(1).map(([x, y]) => `L${x},${y}`).join(" ");
          const opacity = hoveredSeries === null || hoveredSeries === si ? 1 : 0.2;

          return (
            <g key={si} style={{ opacity, transition: "opacity 150ms" }}>
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {showDots && pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3} fill={color} />
              ))}
            </g>
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
            const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
            const dimmed = hoveredSeries !== null && hoveredSeries !== si;
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
                  opacity: dimmed ? 0.4 : 1,
                  transition: "opacity 150ms",
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 2,
                    background: color,
                    borderRadius: 1,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
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
