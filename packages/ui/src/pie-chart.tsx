"use client";

import React, { useState } from "react";

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  slices: PieSlice[];
  size?: number;
  /** 0 = solid pie, 0–1 = donut hole as fraction of radius */
  innerRadius?: number;
  showLegend?: boolean;
  /** Text shown in the center (donut only) */
  centerLabel?: string;
  /** Sub-text shown below centerLabel */
  centerSublabel?: string;
  formatValue?: (value: number, total: number) => string;
}

const COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-info)",
];

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, outerR, startAngle);
  const o2 = polarToCartesian(cx, cy, outerR, endAngle);

  if (innerR <= 0) {
    // Solid pie slice
    return [
      `M ${cx} ${cy}`,
      `L ${o1.x} ${o1.y}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
      "Z",
    ].join(" ");
  }

  // Donut slice
  const i1 = polarToCartesian(cx, cy, innerR, endAngle);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

export function PieChart({
  slices,
  size = 200,
  innerRadius = 0,
  showLegend = true,
  centerLabel,
  centerSublabel,
  formatValue = (v, total) => `${Math.round((v / total) * 100)}%`,
}: PieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!slices.length) return null;

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = innerRadius > 0 ? outerR * innerRadius : 0;

  // Build arc segments
  let angle = -Math.PI / 2; // start at top
  const segments = slices.map((sl, i) => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { slice: sl, start, end, color: sl.color ?? COLORS[i % COLORS.length] };
  });

  const activeSlice = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: "block", overflow: "visible" }}
          aria-label="Pie chart"
        >
          {segments.map((seg, i) => {
            const isHovered = hovered === i;
            const scale = isHovered ? 1.04 : 1;
            return (
              <path
                key={i}
                d={arcPath(cx, cy, outerR, innerR, seg.start, seg.end)}
                fill={seg.color}
                style={{
                  opacity: hovered !== null && !isHovered ? 0.55 : 1,
                  transform: isHovered ? `scale(${scale})` : undefined,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: "opacity 150ms, transform 150ms",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Center label (donut) */}
          {innerR > 0 && (
            <>
              <text
                x={cx}
                y={cy - (centerSublabel ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={activeSlice ? 13 : 16}
                fontWeight={700}
                fill="var(--color-text-primary)"
              >
                {activeSlice
                  ? formatValue(activeSlice.value, total)
                  : centerLabel ?? formatValue(total, total)}
              </text>
              {(centerSublabel || activeSlice) && (
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--color-text-muted)"
                >
                  {activeSlice ? activeSlice.label : centerSublabel}
                </text>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-2) var(--space-4)",
            marginTop: "var(--space-3)",
            justifyContent: "center",
          }}
        >
          {slices.map((sl, i) => {
            const color = sl.color ?? COLORS[i % COLORS.length];
            const pct = Math.round((sl.value / total) * 100);
            return (
              <button
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  opacity: hovered !== null && hovered !== i ? 0.4 : 1,
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
                  {sl.label}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
